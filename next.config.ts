import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
