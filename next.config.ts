import type { NextConfig } from 'next'

const nextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  images: {
    domains: ['jbrijdsdrtcoscdibzee.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jbrijdsdrtcoscdibzee.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig

