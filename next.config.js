/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // X-Frame-Options: DENY was removed from here so your portfolio iframe works
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          
          // Optional: If you ever want to restrict it so ONLY your portfolio can embed it, 
          // uncomment the line below and replace with your actual portfolio URL.
          // { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://your-portfolio-url.vercel.app" }
        ],
      },
    ];
  },
  // Compress images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
