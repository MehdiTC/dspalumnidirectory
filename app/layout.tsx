'use client';
import './globals.css';
import { Inter } from 'next/font/google';
import SupabaseProvider from './SupabaseProvider';
import PostHogProvider from './PostHogProvider';
import { useState, useEffect } from 'react';
import PasswordGate from '../components/PasswordGate';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAccessGranted, setIsAccessGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if access has been granted
    const accessGranted = sessionStorage.getItem('dsp_access_granted') === 'true';
    setIsAccessGranted(accessGranted);
  }, []);

  // Show loading state while checking access
  if (isAccessGranted === null) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#012169] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // Show password gate if access not granted
  if (!isAccessGranted) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <PasswordGate 
            onSuccess={() => {
              setIsAccessGranted(true);
              sessionStorage.setItem('dsp_access_granted', 'true');
            }} 
          />
        </body>
      </html>
    );
  }

  // Show main app if access granted
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
        <PostHogProvider>
            {children}
        </PostHogProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
