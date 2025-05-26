import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { getCroppedImg } from '@/lib/cropImage';
import { FaChevronLeft, FaCheckCircle } from 'react-icons/fa';
import { FiUpload } from 'react-icons/fi';
import { BsLinkedin } from 'react-icons/bs';
import { HiOutlineUserCircle } from 'react-icons/hi';
import { spheres, locations, majors, pledgeSemesters } from '@/lib/constants';
import { MultiSelect } from '@/components/MultiSelect';
import { ProgressBar } from '@/components/ProgressBar';
import { cn } from '@/lib/utils';
import dspLogo2 from '@/public/dspLogo2.png';
import { useUser } from '@supabase/auth-helpers-react';
import type { Profile } from './ProfileModal';

const steps = [
  'welcome',
  'name',
  'email',
  'pledgeClass',
  'roleCompany',
  'sphere',
  'location',
  'gradYear',
  'linkedin',
  'profilePic',
  'major',
  'bio',
  'confirm',
] as const;

type Step = typeof steps[number];

type FormState = {
  name: string;
  email: string;
  pledgeSemester: string;
  pledgeYear: string;
  role: string;
  company: string;
  isStudent: boolean;
  spheres: string[];
  location: string;
  gradYear: string;
  linkedin: string;
  profilePic: File | null;
  croppedPic: string | null;
  major: string;
  bio: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  pledgeSemester: '',
  pledgeYear: '',
  role: '',
  company: '',
  isStudent: false,
  spheres: [],
  location: '',
  gradYear: '',
  linkedin: '',
  profilePic: null,
  croppedPic: null,
  major: '',
  bio: '',
};

const prompts: Record<Step, string> = {
  welcome: 'Welcome! Let\'s get you into the directory.',
  name: 'What\'s your full name?',
  email: 'What\'s your email?',
  pledgeClass: 'Which DSP cohort were you part of?',
  roleCompany: 'Where do you work, and what\'s your role? (Or select \'Current Student\')',
  sphere: 'What industries or spheres are you in? (Select all that apply)',
  location: 'Where are you based now?',
  gradYear: 'What year did you graduate?',
  linkedin: 'What\'s your LinkedIn handle? (just the part after linkedin.com/in/)',
  profilePic: 'Upload a profile picture (crop to fit)',
  major: 'What was your major? (optional)',
  bio: 'Add a short bio (optional)',
  confirm: 'Review your info and join the directory!',
};

const required: Record<Step, boolean> = {
  welcome: false,
  name: true,
  email: true,
  pledgeClass: true,
  roleCompany: true,
  sphere: true,
  location: true,
  gradYear: true,
  linkedin: false,
  profilePic: false,
  major: false,
  bio: false,
  confirm: false,
};

// Update spheres constant for this component
const sphereOptions = [
  'Finance',
  'Consulting',
  'Tech',
  'Other',
];

type JoinFlowProps = {
  onComplete?: () => void;
  onClose?: () => void;
  initialProfile?: Profile | null;
};

export default function JoinFlow({ onComplete, onClose, initialProfile }: JoinFlowProps) {
  const [stepIdx, setStepIdx] = useState(initialProfile ? 1 : 0);
  const [form, setForm] = useState<FormState>(() => {
    if (!initialProfile) return initialState;
    const [pledgeSemester, pledgeYear] = initialProfile.pledgeClass
      ? initialProfile.pledgeClass.split(" '")
      : ['', ''];
    return {
      name: initialProfile.name || '',
      email: initialProfile.email || '',
      pledgeSemester: pledgeSemester || '',
      pledgeYear: pledgeYear || '',
      role: initialProfile.role || '',
      company: initialProfile.company || '',
      isStudent: initialProfile.role === 'Student',
      spheres: initialProfile.sphere || [],
      location: initialProfile.location || '',
      gradYear: initialProfile.graduationYear || '',
      linkedin: initialProfile.linkedinUrl
        ? initialProfile.linkedinUrl.replace(/^https?:\/\/|www\.linkedin\.com\/in\//, '')
        : '',
      profilePic: null,
      croppedPic: initialProfile.profile_picture_url || null,
      major: initialProfile.major || '',
      bio: initialProfile.bio || '',
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useUser();
  const supabase = useSupabaseClient();

  const step = steps[stepIdx];
  const isLast = step === 'confirm';
  const isFirst = stepIdx === 0;

  // Prevent closing when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Store the current state
        sessionStorage.setItem('joinFlowState', JSON.stringify({
          stepIdx,
          form,
          crop,
          zoom,
          croppedAreaPixels,
          showCropper
        }));
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Restore state if it exists
    const savedState = sessionStorage.getItem('joinFlowState');
    if (savedState) {
      const { stepIdx: savedStepIdx, form: savedForm, crop: savedCrop, zoom: savedZoom, croppedAreaPixels: savedCroppedAreaPixels, showCropper: savedShowCropper } = JSON.parse(savedState);
      setStepIdx(savedStepIdx);
      setForm(savedForm);
      setCrop(savedCrop);
      setZoom(savedZoom);
      setCroppedAreaPixels(savedCroppedAreaPixels);
      setShowCropper(savedShowCropper);
      sessionStorage.removeItem('joinFlowState');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stepIdx, form, crop, zoom, croppedAreaPixels, showCropper]);

  // Close profile modal when editing
  useEffect(() => {
    if (initialProfile) {
      // Close any open profile modals
      const closeEvent = new CustomEvent('closeProfileModal');
      window.dispatchEvent(closeEvent);
    }
  }, [initialProfile]);

  // --- Validation ---
  function validateStep(): boolean {
    let valid = true;
    let newErrors: Record<string, string> = {};
    switch (step) {
      case 'name':
        if (!form.name.trim()) {
          newErrors.name = 'Name is required';
          valid = false;
        }
        break;
      case 'email':
        if (!form.email.match(/^\S+@\S+\.\S+$/)) {
          newErrors.email = 'Enter a valid email';
          valid = false;
        }
        break;
      case 'pledgeClass':
        if (!form.pledgeSemester) {
          newErrors.pledgeClass = 'Cohort is required';
          valid = false;
        }
        break;
      case 'roleCompany':
        if (!form.isStudent && (!form.role || !form.company)) {
          newErrors.roleCompany = 'Role and company required, or select student';
          valid = false;
        }
        break;
      case 'sphere':
        if (!form.spheres.length) {
          newErrors.sphere = 'Select at least one sphere';
          valid = false;
        }
        break;
      case 'location':
        if (!form.location) {
          newErrors.location = 'Location required';
          valid = false;
        }
        break;
      case 'gradYear':
        if (!form.gradYear || !String(form.gradYear).match(/^\d{4}$/)) {
          newErrors.gradYear = 'Enter a valid year';
          valid = false;
        }
        break;
      case 'linkedin':
        if (!form.linkedin.match(/^[a-zA-Z0-9\-._]+$/)) {
          newErrors.linkedin = 'Enter just your LinkedIn handle';
          valid = false;
        }
        break;
      case 'profilePic':
        if (!form.croppedPic) {
          newErrors.profilePic = 'Profile picture required';
          valid = false;
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
    return valid;
  }

  // --- Step Navigation ---
  function next() {
    if (required[step] && !validateStep()) return;
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    setErrors({});
  }
  function back() {
    setStepIdx((i) => Math.max(i - 1, 0));
    setErrors({});
  }

  // --- Handlers for each step ---
  function handleInput(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleMultiSelect(name: keyof FormState, values: string[]) {
    setForm((f) => ({ ...f, [name]: values }));
  }

  function handleProfilePic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors({ profilePic: 'File must be an image' });
      return;
    }
    if (file.type === 'image/heic' || file.name.endsWith('.heic')) {
      setErrors({ profilePic: 'HEIC images not supported. Please use JPG or PNG.' });
      return;
    }
    setForm((f) => ({ ...f, profilePic: file }));
    setShowCropper(true);
  }

  async function handleCropComplete(_: any, croppedAreaPixels: any) {
    setCroppedAreaPixels(croppedAreaPixels);
  }

  async function handleCropSave() {
    if (!form.profilePic || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(form.profilePic, croppedAreaPixels);
    setForm((f) => ({ ...f, croppedPic: cropped }));
    setShowCropper(false);
  }

  async function handleEditCrop() {
    if (!form.croppedPic) return;
    
    try {
      // Convert the current cropped image to a File object
      const response = await fetch(form.croppedPic);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      
      setForm(f => ({ ...f, profilePic: file }));
      setShowCropper(true);
    } catch (error) {
      console.error('Error preparing image for edit:', error);
      setErrors({ profilePic: 'Failed to prepare image for editing' });
    }
  }

  // --- Submission ---
  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});
    try {
      // Get current session and user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      if (!session?.user) {
        console.error('No session or user found');
        throw new Error('No authenticated user found. Please try logging in again.');
      }

      console.log('Current user:', session.user.id);

      // 1. Upload image to Supabase Storage
      let picUrl = null;
      if (form.croppedPic && form.croppedPic.startsWith('data:image/')) {
        try {
          const fileExt = 'jpg';
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${session.user.id}/${fileName}`;
          
          console.log('Starting image upload process...');
          
          // List all buckets for debugging
          const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
          console.log('Available buckets:', buckets);
          
          if (bucketsError) {
            console.error('Error listing buckets:', bucketsError);
            throw new Error(`Failed to list storage buckets: ${bucketsError.message}`);
          }

          // Try to upload directly to the bucket
          console.log('Attempting to upload to profile-pictures bucket...');
          const { data, error } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, dataURLtoBlob(form.croppedPic), {
              cacheControl: '3600',
              upsert: true,
            });

          if (error) {
            console.error('Image upload error:', error);
            throw new Error(`Failed to upload image: ${error.message}`);
          }

          console.log('Image uploaded successfully, getting public URL...');
          const { data: { publicUrl } } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);
          
          picUrl = publicUrl;
          console.log('Image upload complete. Public URL:', publicUrl);
        } catch (uploadError: any) {
          console.error('Image upload failed:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
      } else if (form.croppedPic) {
        picUrl = form.croppedPic;
      }

      // 2. Prepare profile data
      const linkedinUrl =
        form.linkedin && form.linkedin.trim() !== ''
          ? `https://www.linkedin.com/in/${form.linkedin.replace(/^https?:\/\/|www\.linkedin\.com\/in\//, '')}`
          : null;

      const profileData = {
        user_id: session.user.id,
        name: form.name,
        email: form.email,
        pledgeClass: `${form.pledgeSemester} '${form.pledgeYear}`,
        role: form.isStudent ? 'Student' : form.role,
        company: form.isStudent ? 'Duke University' : form.company,
        sphere: form.spheres,
        location: form.location,
        graduationYear: parseInt(form.gradYear),
        linkedinUrl: linkedinUrl,
        profile_picture_url: picUrl,
        major: form.major,
        bio: form.bio,
        updated_at: new Date().toISOString(),
      };

      console.log('Submitting profile data:', profileData);

      // 3. First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking existing profile:', checkError);
        throw checkError;
      }

      // 4. Insert or update profile
      let upsertError;
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', session.user.id);
        upsertError = error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);
        upsertError = error;
      }

      if (upsertError) {
        console.error('Upsert error details:', {
          code: upsertError.code,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint
        });
        throw upsertError;
      }

      console.log('Profile updated successfully');
      setStepIdx(steps.length - 1);
      if (onComplete) onComplete();
    } catch (err: any) {
      console.error('Profile update error:', err);
      setErrors({ 
        submit: err.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  }

  // --- Renderers for each step ---
  function renderStep() {
    switch (step) {
      case 'welcome':
        return (
          <div className="flex flex-col items-center gap-6">
            <img src={dspLogo2.src} alt="DSP Logo" className="h-16 w-auto" />
            <h2 className="text-2xl font-bold text-blue-900">Welcome to the DSP Duke Alumni Directory</h2>
            <button
              className="mt-6 px-6 py-3 bg-blue-900 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition"
              onClick={next}
            >
              Get Started
            </button>
          </div>
        );
      case 'name':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              {prompts.name} <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleInput}
              className={cn(
                'w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                errors.name ? 'border-red-500' : 'border-blue-200'
              )}
              placeholder="Full name"
              autoFocus
            />
            {errors.name && <p className="text-red-500 mt-2">{errors.name}</p>}
          </div>
        );
      case 'email':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              {prompts.email} <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleInput}
              className={cn(
                'w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                errors.email ? 'border-red-500' : 'border-blue-200'
              )}
              placeholder="netid@duke.edu"
              autoFocus
              readOnly={!!initialProfile}
            />
            {errors.email && <p className="text-red-500 mt-2">{errors.email}</p>}
          </div>
        );
      case 'pledgeClass':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              Which DSP cohort were you part of? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 items-center">
              <select
                name="pledgeSemester"
                value={form.pledgeSemester}
                onChange={handleInput}
                className={cn(
                  'px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                  errors.pledgeClass ? 'border-red-500' : 'border-blue-200'
                )}
              >
                <option value="">Semester</option>
                <option value="Fall">Fall</option>
                <option value="Spring">Spring</option>
              </select>
              <span className="text-lg text-blue-900">'</span>
              <input
                name="pledgeYear"
                value={form.pledgeYear}
                onChange={handleInput}
                className={cn(
                  'w-16 px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                  errors.pledgeClass ? 'border-red-500' : 'border-blue-200'
                )}
                placeholder="24"
                maxLength={2}
                type="text"
              />
            </div>
            {errors.pledgeClass && <p className="text-red-500 mt-2">{errors.pledgeClass}</p>}
          </div>
        );
      case 'roleCompany':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              {prompts.roleCompany} <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                name="isStudent"
                checked={form.isStudent}
                onChange={handleInput}
                id="isStudent"
                className="accent-blue-900"
              />
              <label htmlFor="isStudent" className="text-blue-900 font-medium">
                I'm a current student
              </label>
            </div>
            {!form.isStudent && (
              <div className="flex gap-4">
                <input
                  name="role"
                  value={form.role}
                  onChange={handleInput}
                  className={cn(
                    'w-1/2 px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                    errors.roleCompany ? 'border-red-500' : 'border-blue-200'
                  )}
                  placeholder="Role (e.g. Analyst)"
                />
                <input
                  name="company"
                  value={form.company}
                  onChange={handleInput}
                  className={cn(
                    'w-1/2 px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                    errors.roleCompany ? 'border-red-500' : 'border-blue-200'
                  )}
                  placeholder="Company (e.g. Goldman Sachs)"
                />
              </div>
            )}
            {errors.roleCompany && <p className="text-red-500 mt-2">{errors.roleCompany}</p>}
          </div>
        );
      case 'sphere':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              What industries or spheres are you in? (Select all that apply) <span className="text-red-500">*</span>
            </label>
            <div className="flex w-full justify-center gap-x-4 mb-2 flex-nowrap">
              {sphereOptions.map((option) => {
                const selected = form.spheres.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setForm((f) => ({ ...f, spheres: f.spheres.filter((s) => s !== option) }));
                      } else {
                        setForm((f) => ({ ...f, spheres: [...f.spheres, option] }));
                      }
                    }}
                    className={cn(
                      'flex-1 min-w-0 px-0 py-2 rounded-full border font-semibold transition text-center',
                      selected
                        ? 'bg-blue-900 text-white border-blue-900 shadow'
                        : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
                    )}
                    style={{ maxWidth: '120px' }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {errors.sphere && <p className="text-red-500 mt-2">{errors.sphere}</p>}
          </div>
        );
      case 'location':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              Where are you based now? <span className="text-red-500">*</span>
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleInput}
              className={cn(
                'w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                errors.location ? 'border-red-500' : 'border-blue-200'
              )}
              placeholder="City, State or Country"
              type="text"
              autoFocus
            />
            {errors.location && <p className="text-red-500 mt-2">{errors.location}</p>}
          </div>
        );
      case 'gradYear':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              Enter graduation year <span className="text-red-500">*</span>
            </label>
            <input
              name="gradYear"
              value={form.gradYear}
              onChange={handleInput}
              className={cn(
                'w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                errors.gradYear ? 'border-red-500' : 'border-blue-200'
              )}
              placeholder="e.g. 2025"
              maxLength={4}
              type="number"
            />
            {errors.gradYear && <p className="text-red-500 mt-2">{errors.gradYear}</p>}
          </div>
        );
      case 'linkedin':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              LinkedIn handle <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">linkedin.com/in/</span>
              <input
                name="linkedin"
                value={form.linkedin}
                onChange={handleInput}
                className={cn(
                  'flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg',
                  errors.linkedin ? 'border-red-500' : 'border-blue-200'
                )}
                placeholder="your-handle"
                type="text"
              />
            </div>
            {errors.linkedin && <p className="text-red-500 mt-2">{errors.linkedin}</p>}
          </div>
        );
      case 'profilePic':
        const initials = form.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              Upload a profile picture <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex flex-col items-center gap-4">
              {form.croppedPic ? (
                <div className="relative">
                  <img
                    src={form.croppedPic}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-900 shadow"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold" style={{ background: '#012169' }}>
                  {initials}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiUpload />
                  {form.croppedPic ? 'Change Photo' : 'Upload Photo'}
                </button>
                {form.croppedPic && (
                  <button
                    type="button"
                    className="px-4 py-2 border border-blue-900 text-blue-900 rounded-lg font-semibold hover:bg-blue-50 transition"
                    onClick={handleEditCrop}
                  >
                    Edit Crop
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleProfilePic}
              />
              {errors.profilePic && <p className="text-red-500 mt-2">{errors.profilePic}</p>}
            </div>
            <AnimatePresence>
              {showCropper && form.profilePic && (
                <motion.div
                  className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4">
                    <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                      <Cropper
                        image={form.profilePic instanceof File ? URL.createObjectURL(form.profilePic) : form.profilePic}
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
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-48"
                    />
                    <div className="flex gap-4">
                      <button
                        className="px-4 py-2 bg-blue-900 text-white rounded-lg"
                        onClick={handleCropSave}
                      >
                        Save
                      </button>
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                        onClick={() => setShowCropper(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'major':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              Enter your major <span className="text-gray-400">(optional)</span>
            </label>
            <input
              name="major"
              value={form.major}
              onChange={handleInput}
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg border-blue-200"
              placeholder="e.g. Economics, Computer Science"
              type="text"
            />
          </div>
        );
      case 'bio':
        return (
          <div>
            <label className="block text-lg font-medium mb-2 text-blue-900">
              Add a short bio <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleInput}
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-lg border-blue-200"
              placeholder="Tell us a bit about yourself"
              rows={4}
              maxLength={300}
            />
            <div className="text-right text-gray-400 text-sm">{form.bio.length}/300</div>
          </div>
        );
      case 'confirm':
        const previewInitials = form.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-2xl font-bold text-blue-900">All set!</h2>
            <div className="w-full max-w-md bg-white rounded-xl p-4 shadow flex items-center gap-4 border border-blue-100">
              {form.croppedPic ? (
                <img
                  src={form.croppedPic}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-900"
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: '#012169' }}>
                  {previewInitials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-blue-900 truncate text-base">{form.name}</div>
                {(form.role || form.company) && (
                  <div className="text-gray-700 text-sm truncate">
                    {form.role}{form.role && form.company ? ' @ ' : ''}{form.company}
                  </div>
                )}
                <div className="text-gray-500 text-xs truncate">
                  {form.pledgeSemester && form.pledgeYear ? `${form.pledgeSemester} '${form.pledgeYear}` : ''}
                </div>
                {form.spheres.length > 0 && (
                  <div className="text-blue-900 text-xs truncate">
                    {form.spheres.join(', ')}
                  </div>
                )}
                {form.location && (
                  <div className="text-gray-500 text-xs truncate">
                    {form.location}
                  </div>
                )}
              </div>
            </div>
            <button
              className={cn(
                'mt-4 px-8 py-3 bg-blue-900 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition text-lg',
                submitting && 'opacity-60 cursor-not-allowed'
              )}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : initialProfile ? 'Save Changes' : 'Join Directory'}
            </button>
            {errors.submit && <p className="text-red-500 mt-2">{errors.submit}</p>}
          </div>
        );
      default:
        return null;
    }
  }

  // --- Main Render ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-8 relative"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none text-2xl"
          >
            &times;
          </button>
        )}
        {/* Top row: Back button and ProgressBar */}
        <div className="flex items-center gap-4 mb-8">
          {!isFirst && (
            <button
              onClick={back}
              className="flex items-center gap-1 text-blue-900 hover:text-blue-700 font-semibold"
            >
              <FaChevronLeft />
              Back
            </button>
          )}
          <div className="flex-1">
            <ProgressBar step={stepIdx} total={steps.length - 1} />
          </div>
        </div>
        <div className="mt-2">{renderStep()}</div>
        {/* Next button for all steps except welcome and confirm */}
        {step !== 'welcome' && step !== 'confirm' && (
          <div className="flex justify-end mt-8">
            <button
              className="px-6 py-3 bg-blue-900 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition text-lg"
              onClick={next}
            >
              Next
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// --- Helper: Convert dataURL to Blob for Supabase upload ---
function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
} 