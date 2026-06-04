/** @type {import('next').NextConfig} */

const isDesktop = process.env.NEXT_APP_TARGET === 'desktop';

const nextConfig = {
  reactStrictMode: false,
  ...(isDesktop && { output: 'standalone' }),
  basePath: isDesktop ? undefined : process.env.NEXT_PUBLIC_BASE_PATH,
  assetPrefix: isDesktop ? undefined : process.env.NEXT_PUBLIC_BASE_PATH,
  serverExternalPackages: ['better-sqlite3', '@react-pdf/renderer', 'pdf-parse'],
  images: {
    domains: [
      'images.unsplash.com',
      'i.ibb.co',
      'scontent.fotp8-1.fna.fbcdn.net',
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;
