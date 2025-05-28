import type { NextConfig } from "next";

const nextConfig = {
  images: {
    domains: ['wvyplrbbicctfdtwwxyt.supabase.co'],
  },
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBailout: false
  }
} as NextConfig;

export default nextConfig;