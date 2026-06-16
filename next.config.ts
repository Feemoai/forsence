import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'react-markdown'],
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/python/:path*',
          destination: 'http://127.0.0.1:5328/api/python/:path*',
        },
      ];
    }
    return [];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
