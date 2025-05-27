import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2 } from 'react-icons/fi';
import { FaCamera } from 'react-icons/fa';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { cn } from '@/lib/utils';

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

const sphereOptions = ['Finance', 'Consulting', 'Tech', 'Other'];

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose, profile, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const session = useSession();
  const isOwner = session?.user?.id === profile?.user_id;

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
    }
  }, [profile]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setEditedProfile(prev => {
      if (!prev) return null;
      const newProfile = { ...prev, [name]: value };
      setHasChanges(true);
      return newProfile;
    });
  }

  function handleSphereChange(sphere: string) {
    setEditedProfile(prev => {
      if (!prev) return null;
      const newSpheres = prev.sphere?.includes(sphere)
        ? prev.sphere.filter(s => s !== sphere)
        : [...(prev.sphere || []), sphere];
      setHasChanges(true);
      return { ...prev, sphere: newSpheres };
    });
  }

  function handlePledgeClassChange(semester: string, year: string) {
    setEditedProfile(prev => {
      if (!prev) return null;
      setHasChanges(true);
      return { ...prev, pledgeClass: `${semester} '${year}` };
    });
  }

  function handleProfilePic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('File must be an image');
      return;
    }
    setProfilePic(file);
    setShowCropper(true);
  }

  async function handleCropComplete(_: any, croppedAreaPixels: any) {
    setCroppedAreaPixels(croppedAreaPixels);
  }

  async function handleCropSave() {
    if (!profilePic || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(profilePic, croppedAreaPixels);
    setEditedProfile(prev => {
      if (!prev) return null;
      setHasChanges(true);
      return { ...prev, profile_picture_url: cropped };
    });
    setShowCropper(false);
  }

  async function handleSave() {
    // TODO: Implement save functionality
    setIsEditing(false);
    setHasChanges(false);
  }

  function handleCancel() {
    setEditedProfile(profile);
    setIsEditing(false);
    setHasChanges(false);
  }

  if (!profile || !editedProfile) return null;

  const [pledgeSemester, pledgeYear] = profile.pledgeClass.split(" '");

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
          {/* Profile Picture Section */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <div className="relative group">
              {editedProfile.profile_picture_url ? (
                <img
                  src={editedProfile.profile_picture_url}
                  alt={editedProfile.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#012169] shadow"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#012169] flex items-center justify-center text-white text-4xl font-bold shadow">
                  {getInitials(editedProfile.name)}
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white hover:text-blue-200 transition-colors"
                  >
                    <FaCamera size={24} />
                  </button>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-900 hover:text-blue-700"
                >
                  Change Photo
                </button>
                {editedProfile.profile_picture_url && (
                  <button
                    onClick={() => setShowCropper(true)}
                    className="text-sm text-blue-900 hover:text-blue-700"
                  >
                    Edit Crop
                  </button>
                )}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleProfilePic}
            />
            {isOwner && !isEditing && (
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
            <div className="flex items-start gap-2">
              {isEditing ? (
                <input
                  name="name"
                  value={editedProfile.name}
                  onChange={handleInputChange}
                  className="text-2xl font-bold text-blue-900 border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                />
              ) : (
                <h2 className="text-2xl font-bold text-blue-900">{editedProfile.name}</h2>
              )}
              {isEditing && (
                <button className="text-gray-400 hover:text-blue-900">
                  <FiEdit2 size={16} />
                </button>
              )}
            </div>

            <div className="flex items-start gap-2 mt-1">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    name="role"
                    value={editedProfile.role}
                    onChange={handleInputChange}
                    placeholder="Role"
                    className="text-gray-700 border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                  />
                  <span className="text-gray-700">@</span>
                  <input
                    name="company"
                    value={editedProfile.company}
                    onChange={handleInputChange}
                    placeholder="Company"
                    className="text-gray-700 border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
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
                <button className="text-gray-400 hover:text-blue-900">
                  <FiEdit2 size={16} />
                </button>
              )}
            </div>

            <div className="text-gray-500 text-sm mb-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <select
                    value={pledgeSemester}
                    onChange={(e) => handlePledgeClassChange(e.target.value, pledgeYear)}
                    className="border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                  >
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                  </select>
                  <span>'</span>
                  <input
                    type="text"
                    value={pledgeYear}
                    onChange={(e) => handlePledgeClassChange(pledgeSemester, e.target.value)}
                    maxLength={2}
                    className="w-8 border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  {editedProfile.graduationYear && (
                    <span>Class of {editedProfile.graduationYear}</span>
                  )}
                  {editedProfile.graduationYear && editedProfile.pledgeClass && <span> • </span>}
                  {editedProfile.pledgeClass && <span>{editedProfile.pledgeClass}</span>}
                </>
              )}
            </div>

            {editedProfile.location && (
              <div className="flex items-start gap-2">
                {isEditing ? (
                  <input
                    name="location"
                    value={editedProfile.location}
                    onChange={handleInputChange}
                    className="text-gray-500 text-sm border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                  />
                ) : (
                  <div className="text-gray-500 text-sm">{editedProfile.location}</div>
                )}
                {isEditing && (
                  <button className="text-gray-400 hover:text-blue-900">
                    <FiEdit2 size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Academic Section */}
            <div className="mt-4 space-y-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-20">Major:</span>
                  <input
                    name="major"
                    value={editedProfile.major || ''}
                    onChange={handleInputChange}
                    className="flex-1 border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                  />
                </div>
              ) : (
                editedProfile.major && (
                  <div className="flex items-center text-gray-700 text-sm">
                    <span className="font-semibold w-20">Major:</span>
                    <span className="truncate">{editedProfile.major}</span>
                  </div>
                )
              )}

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-20">Spheres:</span>
                  <div className="flex flex-wrap gap-2">
                    {sphereOptions.map((sphere) => (
                      <button
                        key={sphere}
                        onClick={() => handleSphereChange(sphere)}
                        className={cn(
                          'px-2 py-1 rounded text-sm',
                          editedProfile.sphere?.includes(sphere)
                            ? 'bg-blue-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        {sphere}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                editedProfile.sphere && editedProfile.sphere.length > 0 && (
                  <div className="flex items-center text-gray-700 text-sm">
                    <span className="font-semibold w-20">Spheres:</span>
                    <span className="truncate text-[#012169] font-medium">
                      {editedProfile.sphere.join(', ')}
                    </span>
                  </div>
                )
              )}

              <div className="flex items-start gap-2">
                {isEditing ? (
                  <input
                    name="email"
                    value={editedProfile.email}
                    onChange={handleInputChange}
                    className="flex-1 border-b-2 border-blue-200 focus:border-blue-900 focus:outline-none"
                  />
                ) : (
                  <a href={`mailto:${editedProfile.email}`} className="truncate underline hover:text-indigo-700 break-all">
                    {editedProfile.email}
                  </a>
                )}
                {isEditing && (
                  <button className="text-gray-400 hover:text-blue-900">
                    <FiEdit2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-6 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-900 rounded-full"></div>
              <div className="pl-4">
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={editedProfile.bio || ''}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 italic text-gray-700 border-2 border-blue-200 focus:border-blue-900 focus:outline-none rounded p-2"
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

            {/* Save/Cancel Buttons */}
            {isEditing && hasChanges && (
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#012169] text-white rounded-md font-semibold shadow hover:bg-indigo-900 transition"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Image Cropper Modal */}
        <AnimatePresence>
          {showCropper && profilePic && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4">
                <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Cropper
                    image={URL.createObjectURL(profilePic)}
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ProfileModal; 