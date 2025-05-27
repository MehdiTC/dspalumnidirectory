import type { NextConfig } from "next";

const nextConfig = {
  images: {
    domains: ['wvyplrbbicctfdtwwxyt.supabase.co'],
  },
  async redirects() {
    return [
      {
        source: '/auth/callback',
        destination: '/',
        permanent: true,
      },
    ];
  },
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBailout: false
  }
} as NextConfig;

export default nextConfig;