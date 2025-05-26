import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from './ProfileModal';
import { useSession } from '@supabase/auth-helpers-react';

interface JoinDirectoryModalProps {
  open: boolean;
  onClose: () => void;
  initialProfile?: Profile | null;
  onSuccess: () => void;
}

const pledgeClassPattern = /^(Fall|Spring) '\d{2}$/;

const requiredFields = [
  'name',
  'email',
  'pledgeClass',
  'major',
  'location',
];

export default function JoinDirectoryModal({ open, onClose, initialProfile, onSuccess }: JoinDirectoryModalProps) {
  const [form, setForm] = useState<Partial<Profile>>(initialProfile || {});
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();

  const overlayRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(e.target.files[0]);
    }
  }

  function validate() {
    for (const field of requiredFields) {
      if (!form[field as keyof Profile] || String(form[field as keyof Profile]).trim() === '') {
        setError(`Please enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return false;
      }
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email || '')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!pledgeClassPattern.test(form.pledgeClass || '')) {
      setError("Pledge class must be in the format: Fall '24 or Spring '23");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    let profile_picture_url = form.profile_picture_url || '';
    try {
      // Upload profile picture if provided
      if (profilePic) {
        const fileExt = profilePic.name.split('.').pop();
        const fileName = `${form.email?.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage.from('profile-pictures').upload(fileName, profilePic, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
        profile_picture_url = publicUrlData.publicUrl;
      }
      // Strip id before insert/update
      const { id, ...safeForm } = form;
      // Always use magic link sign-in for new users
      if (!session) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: form.email || '',
          options: {
            emailRedirectTo: process.env.NODE_ENV === 'production'
              ? 'https://dukedsp.com/auth/callback'
              : `${window.location.origin}/auth/callback`,
          },
        });
        if (otpError) throw otpError;
        setLoading(false);
        setError('Check your email for a magic link to sign in.');
        return;
      }
      const user = session.user;
      if (!user) throw new Error('User not authenticated');
      let error;
      if (initialProfile) {
        // Edit: update existing profile
        ({ error } = await supabase.from('profiles').update({
          ...safeForm,
          profile_picture_url,
          user_id: user.id,
        }).eq('user_id', user.id));
      } else {
        // New: insert new profile
        ({ error } = await supabase.from('profiles').insert({
          ...safeForm,
          profile_picture_url,
          user_id: user.id,
        }));
      }
      if (error) throw error;
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Something went wrong.');
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <form onSubmit={handleSubmit} className="relative bg-white max-w-lg w-full rounded-lg shadow-xl p-8 overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">{initialProfile ? 'Edit Your Profile' : 'Join the Directory'}</h2>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input name="name" value={form.name || ''} onChange={handleChange} required className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input name="email" type="email" value={form.email || ''} onChange={handleChange} required className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pledge Class *</label>
              <input name="pledgeClass" value={form.pledgeClass || ''} onChange={handleChange} required placeholder="Fall '24" className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Major *</label>
              <input name="major" value={form.major || ''} onChange={handleChange} required className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (State or Country) *</label>
              <input name="location" value={form.location || ''} onChange={handleChange} required className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
              <input name="graduationYear" value={form.graduationYear || ''} onChange={handleChange} placeholder="2024" className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
              <input name="linkedinUrl" value={form.linkedinUrl || ''} onChange={handleChange} placeholder="https://linkedin.com/in/yourprofile" className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
              <input name="profilePic" type="file" accept="image/*" onChange={handleFileChange} className="w-full h-10 text-sm text-black bg-white placeholder-gray-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea name="bio" value={form.bio || ''} onChange={handleChange} rows={3} className="w-full px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] text-sm text-black bg-white placeholder-gray-500" />
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full h-10 bg-[#012169] text-white rounded-md font-semibold hover:bg-indigo-800 transition disabled:opacity-60 mt-2">
            {loading ? 'Submitting…' : initialProfile ? 'Save Changes' : 'Join Directory'}
          </button>
        </div>
      </form>
    </div>
  );
} 