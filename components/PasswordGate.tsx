'use client';
import { useState } from 'react';
import Image from 'next/image';

interface PasswordGateProps {
  onSuccess: () => void;
}

export default function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if password is correct
      if (password === 'dspalumni1907') {
        // Store in session storage to persist across page refreshes
        sessionStorage.setItem('dsp_access_granted', 'true');
        onSuccess();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/dspLogo2.png"
              alt="DSP Logo"
              width={80}
              height={80}
              className="h-20 w-auto"
            />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            DSP Alumni Directory
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter the password to access the directory
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#012169] focus:border-[#012169] focus:z-10 sm:text-sm"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#012169] hover:bg-[#001a4d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#012169] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 