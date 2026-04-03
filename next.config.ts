import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for custom server (Socket.io)
  experimental: {},
  // Disable static optimization for API routes that use Socket.io
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    const baseSecurityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    const hstsHeader =
      process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : [];

    return [
      {
        source: '/:path*',
        headers: [...baseSecurityHeaders, ...hstsHeader],
      },
    ];
  },
};

export default nextConfig;
