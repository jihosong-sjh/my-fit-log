import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@myfit/ui'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL ?? 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};
export default config;
