import React, { useEffect, useRef } from 'react';
import { useSession } from '@supabase/auth-helpers-react';

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
    .toUpperCase();
}

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose, profile, onEdit }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const session = useSession();
  const isOwner = session?.user?.id && profile?.user_id && session.user.id === profile.user_id;

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Listen for edit profile event
  useEffect(() => {
    const handleCloseModal = () => {
      onClose();
    };
    window.addEventListener('closeProfileModal', handleCloseModal);
    return () => window.removeEventListener('closeProfileModal', handleCloseModal);
  }, [onClose]);

  // Close on outside click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  if (!open || !profile) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <div className="relative bg-white max-w-2xl w-full rounded-lg shadow-xl p-10 overflow-y-auto max-h-[90vh]">
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
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-[#012169] shadow"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-[#012169] flex items-center justify-center text-white text-4xl font-bold shadow">
                {getInitials(profile.name)}
              </div>
            )}
            {isOwner && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-[#012169] text-white rounded-md font-semibold shadow hover:bg-indigo-900 transition"
              >
                Edit Profile
              </button>
            )}
          </div>
          {/* Main Info */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-x-3 mb-1">
                  <h2 className="text-3xl font-bold text-gray-900 leading-tight break-words flex-1 min-w-0">{profile.name}</h2>
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#012169] hover:text-indigo-700 flex items-center justify-center ml-1"
                      aria-label="LinkedIn profile"
                    >
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="text-gray-600 text-base font-semibold mb-1">
              {profile.role}
              {profile.company && (
                <span> @ {profile.company}</span>
              )}
            </div>
            <div className="text-gray-500 text-sm mb-1">
              {profile.graduationYear && (
                <span>Class of {profile.graduationYear}</span>
              )}
              {profile.graduationYear && profile.pledgeClass && <span> • </span>}
              {profile.pledgeClass && <span>{profile.pledgeClass} </span>}
            </div>
            {profile.location && (
              <div className="text-gray-500 text-sm mb-4">{profile.location}</div>
            )}
            {/* Academic Section */}
            {(profile.major || profile.minor) && (
              <div className="mb-4 space-y-1">
                {profile.major && (
                  <div className="flex items-center text-gray-700 text-sm">
                    <span className="font-semibold w-20">Major:</span>
                    <span className="truncate">{profile.major}</span>
                  </div>
                )}
                {profile.minor && (
                  <div className="flex items-center text-gray-700 text-sm">
                    <span className="font-semibold w-20">Minor:</span>
                    <span className="truncate">{profile.minor}</span>
                  </div>
                )}
                {profile.sphere && profile.sphere.length > 0 && (
                  <div className="flex items-center text-gray-700 text-sm">
                    <span className="font-semibold w-20">Spheres:</span>
                    <span className="truncate text-[#012169] font-medium">{profile.sphere.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-700 text-sm">
                  <span className="font-semibold w-20">Email:</span>
                  <a href={`mailto:${profile.email}`} className="truncate underline hover:text-indigo-700 break-all">{profile.email}</a>
                </div>
              </div>
            )}
            {/* Divider */}
            <div className="border-t border-gray-200 my-6" />
            {/* Bio Block */}
            {profile.bio && (
              <blockquote className="italic text-gray-700 text-base leading-relaxed border-l-4 border-[#012169] pl-4 bg-gray-50 py-4">
                {profile.bio}
              </blockquote>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal; 