import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2 } from 'react-icons/fi';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { cn } from '@/lib/utils';
import { FaLinkedin } from 'react-icons/fa';

export type Profile = {
  id?: string;
  name: string;
  role: string;
  company: string;
  sphere?: string[];
  major?: string;
  minor?: string;
  location: string;
  pledgeClass: string;
  graduationYear?: string;
  email: string;
  linkedinUrl?: string;
  bio?: string;
  profile_picture_url?: string;
  user_id?: string;
};

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onEdit: () => void;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const sphereOptions = ['Finance', 'Consulting', 'Tech', 'Other'];

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose, profile, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const session = useSession();
  const supabase = useSupabaseClient();

  // Helper for cohort
  const [pledgeSemester, pledgeYear] = (editedProfile?.pledgeClass || '').split(" '");

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setHasChanges(false);
      setError(null);
    }
  }, [open]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setEditedProfile(prev => {
      if (!prev) return null;
      const newProfile = { ...prev, [name]: value };
      setHasChanges(true);
      return newProfile;
    });
  }

  function handleProfilePicClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }
    
    setNewProfilePic(file);
    setShowCropper(true);
  }

  async function handleCropComplete(_: any, croppedAreaPixels: any) {
    setCroppedAreaPixels(croppedAreaPixels);
  }

  async function handleCropSave() {
    if (!newProfilePic || !croppedAreaPixels) return;
    
    try {
      const cropped = await getCroppedImg(newProfilePic, croppedAreaPixels);
      setEditedProfile(prev => {
        if (!prev) return null;
        return { ...prev, profile_picture_url: cropped };
      });
      setHasChanges(true);
      setShowCropper(false);
    } catch (err) {
      setError('Failed to crop image');
    }
  }

  function handleSphereToggle(sphere: string) {
    setEditedProfile(prev => {
      if (!prev) return null;
      const spheres = prev.sphere || [];
      return {
        ...prev,
        sphere: spheres.includes(sphere)
          ? spheres.filter(s => s !== sphere)
          : [...spheres, sphere],
      };
    });
    setHasChanges(true);
  }

  function handleCohortChange(semester: string, year: string) {
    setEditedProfile(prev => {
      if (!prev) return null;
      return { ...prev, pledgeClass: `${semester} '${year}` };
    });
    setHasChanges(true);
  }

  function handleGradYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditedProfile(prev => {
      if (!prev) return null;
      return { ...prev, graduationYear: e.target.value };
    });
    setHasChanges(true);
  }

  async function handleSave() {
    if (!editedProfile || !session?.user) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Upload new profile picture if changed
      let profile_picture_url = editedProfile.profile_picture_url;
      if (editedProfile.profile_picture_url?.startsWith('data:image/')) {
        const fileExt = 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;
        
        const blob = dataURLtoBlob(editedProfile.profile_picture_url);
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: true,
          });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);
          
        profile_picture_url = publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...editedProfile,
          profile_picture_url,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      setHasChanges(false);
      onEdit(); // Refresh profile data
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setEditedProfile(profile);
    setIsEditing(false);
    setHasChanges(false);
    setError(null);
  }

  if (!profile || !editedProfile) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white max-w-2xl w-full rounded-lg shadow-xl p-10 overflow-y-auto max-h-[90vh]"
      >
        {/* LinkedIn logo in top right when not editing */}
        {!isEditing && editedProfile?.linkedinUrl && (
          <a
            href={editedProfile.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-16 text-[#012169] hover:text-blue-700"
            aria-label="LinkedIn profile"
          >
            <FaLinkedin size={28} />
          </a>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Profile Picture */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <div className="relative group">
              {editedProfile?.profile_picture_url ? (
                <img
                  src={editedProfile.profile_picture_url}
                  alt={editedProfile.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#012169] shadow"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#012169] flex items-center justify-center text-white text-4xl font-bold shadow">
                  {getInitials(editedProfile?.name || '')}
                </div>
              )}
            </div>
            {/* Show photo buttons only in edit mode */}
            {isEditing && (
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={handleProfilePicClick}
                  className="w-full py-2 bg-[#012169] text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition text-base"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => setShowCropper(true)}
                  className="w-full py-2 border-2 border-[#012169] text-[#012169] rounded-lg font-semibold hover:bg-blue-50 transition text-base"
                >
                  Edit Crop
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {session?.user?.id === profile.user_id && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[#012169] text-white rounded-md font-semibold shadow hover:bg-indigo-900 transition"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="space-y-4">
              {/* Name */}
              <div className="group relative">
                {isEditing ? (
                  <input
                    name="name"
                    value={editedProfile.name}
                    onChange={handleInputChange}
                    className="w-full text-2xl font-bold text-[#012169] bg-transparent border-b-2 border-[#012169] focus:outline-none"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-[#012169]">{editedProfile.name}</h2>
                )}
                {isEditing && (
                  <FiEdit2 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#012169] transition-colors" />
                )}
              </div>

              {/* Role & Company */}
              <div className="group relative">
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      name="role"
                      value={editedProfile.role}
                      onChange={handleInputChange}
                      placeholder="Role"
                      className="flex-1 bg-transparent border-b-2 border-[#012169] focus:outline-none"
                    />
                    <span className="text-gray-500">@</span>
                    <input
                      name="company"
                      value={editedProfile.company}
                      onChange={handleInputChange}
                      placeholder="Company"
                      className="flex-1 bg-transparent border-b-2 border-[#012169] focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="text-gray-700">
                    {editedProfile.role}
                    {editedProfile.role && editedProfile.company ? ' @ ' : ''}
                    {editedProfile.company}
                  </div>
                )}
                {isEditing && (
                  <FiEdit2 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#012169] transition-colors" />
                )}
              </div>

              {/* Graduation Year, Cohort, Location (display mode) */}
              {!isEditing && (
                <>
                  <div className="text-gray-500 text-sm">
                    {editedProfile.graduationYear && (
                      <span>Class of {editedProfile.graduationYear}</span>
                    )}
                    {editedProfile.graduationYear && editedProfile.pledgeClass && <span> • </span>}
                    {editedProfile.pledgeClass && <span>{editedProfile.pledgeClass}</span>}
                  </div>
                  {editedProfile.location && (
                    <div className="text-gray-500 text-sm">{editedProfile.location}</div>
                  )}
                </>
              )}
              {/* Graduation Year, Cohort, Location (edit mode) */}
              {isEditing && (
                <div className="w-full">
                  {/* Graduation Year */}
                  <div className="flex flex-col w-full mb-2">
                    <div className="flex items-center w-full">
                      <span className="text-gray-500 mr-2 text-base">Class of</span>
                      <input
                        name="graduationYear"
                        value={editedProfile.graduationYear || ''}
                        onChange={handleGradYearChange}
                        placeholder="2028"
                        maxLength={4}
                        className="flex-1 bg-transparent text-base border-none focus:outline-none"
                      />
                    </div>
                    <div className="border-b-2 border-[#012169] w-full" />
                  </div>
                  {/* Cohort */}
                  <div className="flex flex-col w-full mb-2">
                    <div className="flex items-center w-full">
                      <select
                        value={pledgeSemester || ''}
                        onChange={e => handleCohortChange(e.target.value, pledgeYear || '')}
                        className="bg-transparent text-base border-none focus:outline-none appearance-none pr-4"
                        style={{ minWidth: 80 }}
                      >
                        <option value="Spring">Spring</option>
                        <option value="Fall">Fall</option>
                      </select>
                      <span className="mx-1 text-base">'</span>
                      <input
                        type="text"
                        value={pledgeYear || ''}
                        onChange={e => handleCohortChange(pledgeSemester || '', e.target.value)}
                        maxLength={2}
                        className="w-8 bg-transparent text-base border-none focus:outline-none"
                      />
                    </div>
                    <div className="border-b-2 border-[#012169] w-full" />
                  </div>
                  {/* Location */}
                  <div className="flex flex-col w-full mb-2">
                    <input
                      name="location"
                      value={editedProfile.location}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-none text-base focus:outline-none"
                      placeholder="Location"
                    />
                    <div className="border-b-2 border-[#012169] w-full" />
                  </div>
                </div>
              )}

              {/* Academic Info */}
              <div className="space-y-2">
                {/* Major */}
                <div className="group relative">
                  {isEditing ? (
                    <input
                      name="major"
                      value={editedProfile.major || ''}
                      onChange={handleInputChange}
                      placeholder="Add your major"
                      className="w-full bg-transparent border-b-2 border-[#012169] focus:outline-none"
                    />
                  ) : (
                    editedProfile.major && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-semibold w-20">Major:</span>
                        <span>{editedProfile.major}</span>
                      </div>
                    )
                  )}
                  {isEditing && (
                    <FiEdit2 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#012169] transition-colors" />
                  )}
                </div>

                {/* Spheres */}
                <div className="group relative">
                  {isEditing ? (
                    <div className="flex gap-2 my-2">
                      {sphereOptions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSphereToggle(s)}
                          className={cn(
                            'px-3 py-1 rounded-full border-2',
                            editedProfile.sphere?.includes(s)
                              ? 'bg-[#012169] text-white border-[#012169]'
                              : 'bg-white text-[#012169] border-[#012169] hover:bg-blue-50'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    editedProfile.sphere && editedProfile.sphere.length > 0 && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-semibold w-20">Spheres:</span>
                        <span className="text-[#012169] font-medium">{editedProfile.sphere.join(', ')}</span>
                      </div>
                    )
                  )}
                  {isEditing && (
                    <FiEdit2 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#012169] transition-colors" />
                  )}
                </div>

                {/* Email */}
                <div className="group relative">
                  {isEditing ? (
                    <input
                      name="email"
                      value={editedProfile.email}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-b-2 border-[#012169] focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center text-gray-700">
                      <span className="font-semibold w-20">Email:</span>
                      <a href={`mailto:${editedProfile.email}`} className="underline hover:text-indigo-700 break-all">
                        {editedProfile.email}
                      </a>
                    </div>
                  )}
                  {isEditing && (
                    <FiEdit2 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#012169] transition-colors" />
                  )}
                </div>

                {/* LinkedIn */}
                <div className="group relative">
                  {isEditing ? (
                    <input
                      name="linkedinUrl"
                      value={editedProfile.linkedinUrl || ''}
                      onChange={handleInputChange}
                      placeholder="Add your LinkedIn URL"
                      className="w-full bg-transparent border-b-2 border-[#012169] focus:outline-none"
                    />
                  ) : (
                    editedProfile.linkedinUrl && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-semibold w-20">LinkedIn:</span>
                        <a
                          href={editedProfile.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#012169] hover:underline"
                        >
                          {editedProfile.linkedinUrl.replace(/^https?:\/\/|www\.linkedin\.com\/in\//, '')}
                        </a>
                      </div>
                    )
                  )}
                  {isEditing && (
                    <FiEdit2 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#012169] transition-colors" />
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="mt-4 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-900 rounded-full"></div>
                <div className="pl-4">
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={editedProfile.bio || ''}
                      onChange={handleInputChange}
                      placeholder="Add a short bio"
                      className="w-full bg-gray-50 italic text-gray-700 border-2 border-blue-200 focus:border-blue-900 focus:outline-none rounded p-4"
                      rows={4}
                      maxLength={300}
                    />
                  ) : (
                    <div className="bg-gray-50 italic text-gray-700 p-4 rounded">
                      {editedProfile.bio || 'No bio provided'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save/Cancel buttons sticky at bottom in edit mode */}
            {isEditing && hasChanges && (
              <div className="sticky bottom-0 left-0 right-0 bg-white pt-6 pb-2 flex justify-end gap-4 z-10 border-t border-gray-200 mt-8">
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#012169] text-white rounded-md font-semibold shadow hover:bg-indigo-900 transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            )}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 mt-4"
              >
                {error}
              </motion.p>
            )}
          </div>
        </div>

        {/* Image Cropper Modal */}
        <AnimatePresence>
          {showCropper && newProfilePic && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4"
              >
                <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Cropper
                    image={URL.createObjectURL(newProfilePic)}
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
                    className="px-4 py-2 bg-[#012169] text-white rounded-lg"
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Helper function to convert dataURL to Blob
function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export default ProfileModal; 