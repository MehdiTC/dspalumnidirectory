import React, { useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { FaLinkedin } from 'react-icons/fa';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const sphereOptions = ['Finance', 'Consulting', 'Tech', 'Other'];

const steps = [
  'Welcome',
  'Basic Info',
  'Professional Info',
  'Profile Picture',
  'Bio',
  'Review',
];

interface JoinWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinWizard({ open, onClose, onSuccess }: JoinWizardProps) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    pledgeClassSemester: '',
    pledgeClassYear: '',
    graduationYear: '',
    major: '',
    location: '',
    sphere: [] as string[],
    role: '',
    company: '',
    isStudent: false,
    linkedinUrl: '',
    profile_picture_url: '',
    bio: '',
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper to combine pledge class
  const pledgeClass = form.pledgeClassSemester && form.pledgeClassYear ? `${form.pledgeClassSemester} '${form.pledgeClassYear}` : '';

  function next() {
    setError(null);
    if (!validateStep()) return;
    setStep((s) => s + 1);
  }
  function back() {
    setError(null);
    setStep((s) => s - 1);
  }
  function validateStep() {
    if (step === 1) {
      if (!form.name.trim()) { setError('Name is required.'); return false; }
      if (!form.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) { setError('Valid email required.'); return false; }
      if (!form.pledgeClassSemester || !form.pledgeClassYear.match(/^\d{2}$/)) { setError('Pledge class is required.'); return false; }
      if (!form.graduationYear.match(/^\d{4}$/)) { setError('Graduation year required.'); return false; }
      if (!form.major.trim()) { setError('Major is required.'); return false; }
      return true;
    }
    if (step === 2) {
      if (!form.sphere.length) { setError('Pick at least one sphere.'); return false; }
      if (!form.isStudent && (!form.role.trim() || !form.company.trim())) { setError('Role and company required unless you are a student.'); return false; }
      return true;
    }
    return true;
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((f) => {
        if (name === 'isStudent' && checked) {
          return { ...f, isStudent: true, role: 'Student', company: 'Duke University' };
        } else if (name === 'isStudent' && !checked) {
          return { ...f, isStudent: false, role: '', company: '' };
        } else {
          return { ...f, [name]: checked };
        }
      });
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }
  function handleSphere(s: string) {
    setForm((f) => ({ ...f, sphere: f.sphere.includes(s) ? f.sphere.filter(x => x !== s) : [...f.sphere, s] }));
  }
  async function handleCropComplete(_: unknown, croppedAreaPixels: any) {
    setCroppedAreaPixels(croppedAreaPixels);
  }
  async function handleCropSave() {
    if (!profilePic || !croppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(profilePic, croppedAreaPixels);
      setForm((f) => ({ ...f, profile_picture_url: cropped }));
      setShowCropper(false);
    } catch {
      setError('Failed to crop image');
    }
  }
  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let profile_picture_url = form.profile_picture_url;
      // Upload profile picture if it's a data URL
      if (profile_picture_url && profile_picture_url.startsWith('data:image/')) {
        const fileExt = 'jpg';
        const fileName = `${form.email.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        // Convert dataURL to Blob
        const arr = profile_picture_url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const blob = new Blob([u8arr], { type: mime });
        const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(filePath, blob, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
        profile_picture_url = publicUrlData.publicUrl;
      }
      // Insert profile
      const { error: insertError } = await supabase.from('profiles').insert({
        user_id: session?.user?.id,
        name: form.name,
        email: form.email,
        pledgeClass: pledgeClass,
        graduationYear: form.graduationYear,
        major: form.major,
        location: form.location,
        sphere: form.sphere,
        role: form.isStudent ? 'Student' : form.role,
        company: form.isStudent ? 'Duke University' : form.company,
        linkedinUrl: form.linkedinUrl,
        bio: form.bio,
        profile_picture_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  // Add helper for initials
  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-2">
      <motion.div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#012169]"
              initial={{ width: 0 }}
              animate={{ width: `${((step) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">Step {step + 1} of {steps.length}</div>
        </div>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col items-center justify-center py-8">
                <Image src="/dspLogo2.png" alt="DSP Logo" width={90} height={90} />
                <h2 className="text-3xl font-extrabold mt-6 mb-2 text-center text-[#012169]">Welcome!</h2>
                <div className="w-16 h-1 bg-[#012169] rounded-full mb-4" />
                <p className="text-gray-600 text-center mb-8">Let's get you set up in the DSP Alumni Directory.<br/>This will only take a few minutes.</p>
                <button className="px-8 py-3 bg-[#012169] text-white rounded-lg font-bold shadow hover:bg-blue-800 transition text-lg" onClick={next}>Get Started</button>
              </div>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="basic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-1 text-[#012169]">Basic Info</h2>
              <div className="w-12 h-1 bg-[#012169] rounded-full mb-6" />
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Full Name <span className="text-[#012169]">*</span></label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Email <span className="text-[#012169]">*</span></label>
                  <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Pledge Class <span className="text-[#012169]">*</span></label>
                  <div className="flex gap-2">
                    <select name="pledgeClassSemester" value={form.pledgeClassSemester} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required>
                      <option value="">Semester</option>
                      <option value="Spring">Spring</option>
                      <option value="Fall">Fall</option>
                    </select>
                    <input name="pledgeClassYear" value={form.pledgeClassYear} onChange={handleChange} placeholder="YY" maxLength={2} className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Graduation Year <span className="text-[#012169]">*</span></label>
                  <input name="graduationYear" value={form.graduationYear} onChange={handleChange} placeholder="Graduation Year (e.g. 2024)" type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Major <span className="text-[#012169]">*</span></label>
                  <input name="major" value={form.major} onChange={handleChange} placeholder="Major" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <button className="text-[#012169] font-semibold hover:underline" onClick={onClose}>Cancel</button>
                <button className="px-8 py-2 bg-[#012169] text-white rounded-lg font-bold shadow hover:bg-blue-800 transition" onClick={next}>Next</button>
              </div>
              {error && <div className="text-red-600 text-sm mt-2 font-semibold">{error}</div>}
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="prof" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-1 text-[#012169]">Professional Info</h2>
              <div className="w-12 h-1 bg-[#012169] rounded-full mb-6" />
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Sphere <span className="text-[#012169]">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {sphereOptions.map(s => (
                      <button key={s} type="button" onClick={() => handleSphere(s)} className={cn('px-4 py-1.5 rounded-full border-2 font-semibold transition', form.sphere.includes(s) ? 'bg-[#012169] text-white border-[#012169]' : 'bg-white text-[#012169] border-[#012169] hover:bg-blue-50')}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="isStudent" checked={form.isStudent} onChange={handleChange} className="accent-[#012169] w-5 h-5" />
                  <span className="text-[#012169] font-medium">I'm a current student</span>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">Role @ Company <span className="text-[#012169]">*</span></label>
                  {form.isStudent ? (
                    <div className="flex items-center gap-2">
                      <input name="role" value="Student" readOnly className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700" />
                      <span className="text-[#012169] font-bold text-lg">@</span>
                      <input name="company" value="Duke University" readOnly className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input name="role" value={form.role} onChange={handleChange} placeholder="Role" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                      <span className="text-[#012169] font-bold text-lg">@</span>
                      <input name="company" value={form.company} onChange={handleChange} placeholder="Company" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" required />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#012169]">LinkedIn <span className="text-xs text-gray-400 ml-1">Optional</span></label>
                  <input name="linkedinUrl" value={form.linkedinUrl} onChange={handleChange} placeholder="LinkedIn URL" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" />
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <button className="text-[#012169] font-semibold hover:underline" onClick={back}>Back</button>
                <button className="px-8 py-2 bg-[#012169] text-white rounded-lg font-bold shadow hover:bg-blue-800 transition" onClick={next}>Next</button>
              </div>
              {error && <div className="text-red-600 text-sm mt-2 font-semibold">{error}</div>}
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="pic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-1 text-[#012169]">Profile Picture <span className="text-gray-400 text-base font-normal">(optional)</span></h2>
              <div className="w-12 h-1 bg-[#012169] rounded-full mb-6" />
              <div className="flex flex-col items-center gap-4">
                {form.profile_picture_url ? (
                  <img src={form.profile_picture_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-[#012169] shadow" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-[#012169] flex items-center justify-center text-white text-4xl font-bold shadow">
                    {getInitials(form.name || '')}
                  </div>
                )}
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('profile-upload-input');
                      if (input) (input as HTMLInputElement).click();
                    }}
                    className="flex-1 py-2 bg-[#012169] text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition text-sm"
                  >
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (profilePic !== null || form.profile_picture_url) setShowCropper(true); }}
                    className="flex-1 py-2 border-2 border-[#012169] text-[#012169] rounded-lg font-semibold hover:bg-blue-50 transition text-sm"
                  >
                    Edit Crop
                  </button>
                  <input
                    id="profile-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file) setProfilePic(file);
                        setShowCropper(true);
                      }
                    }}
                  />
                </div>
                {showCropper && (profilePic || form.profile_picture_url) && (
                  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4">
                      <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                        <Cropper
                          image={profilePic ? URL.createObjectURL(profilePic) : form.profile_picture_url || ''}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={handleCropComplete}
                          showGrid={true}
                          cropShape="round"
                        />
                      </div>
                      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-48" />
                      <div className="flex gap-4">
                        <button className="px-4 py-2 bg-[#012169] text-white rounded-lg" onClick={handleCropSave}>Save</button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg" onClick={() => setShowCropper(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-8">
                <button className="text-[#012169] font-semibold hover:underline" onClick={back}>Back</button>
                <button className="px-8 py-2 bg-[#012169] text-white rounded-lg font-bold shadow hover:bg-blue-800 transition" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="bio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-1 text-[#012169]">Bio <span className="text-gray-400 text-base font-normal">(optional)</span></h2>
              <div className="w-12 h-1 bg-[#012169] rounded-full mb-6" />
              <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Add a short bio (max 300 chars)" maxLength={300} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-[#012169] transition" />
              <div className="flex justify-between mt-8">
                <button className="text-[#012169] font-semibold hover:underline" onClick={back}>Back</button>
                <button className="px-8 py-2 bg-[#012169] text-white rounded-lg font-bold shadow hover:bg-blue-800 transition" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-3xl font-extrabold mb-1 text-[#012169] text-center">All Set!</h2>
              <div className="w-16 h-1 bg-[#012169] rounded-full mb-6 mx-auto" />
              {/* Directory card preview */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 mb-8 border border-gray-100 max-w-md mx-auto">
                {/* Avatar */}
                {form.profile_picture_url ? (
                  <img
                    src={form.profile_picture_url}
                    alt={form.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#012169]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#012169] flex items-center justify-center text-white text-xl font-bold">
                    {getInitials(form.name || '')}
                  </div>
                )}
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-[#012169] truncate">{form.name}</h3>
                  <p className="text-sm text-gray-700 mt-1 truncate">{form.isStudent ? 'Student' : form.role} {form.company && !form.isStudent ? <span className="text-gray-400">@</span> : ''} {form.company && !form.isStudent ? form.company : ''}</p>
                  <p className="text-xs text-gray-500 mt-1">{pledgeClass}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.sphere.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-[#012169]/10 text-[#012169] text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{form.location}</p>
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <button className="text-[#012169] font-semibold hover:underline" onClick={back}>Back</button>
                <button className="px-8 py-3 bg-[#012169] text-white rounded-lg font-bold shadow hover:bg-blue-800 transition text-lg" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Join Directory'}</button>
              </div>
              {error && <div className="text-red-600 text-sm mt-2 font-semibold text-center">{error}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 