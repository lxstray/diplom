/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      yjs: 'yjs',
      'y-protocols': 'y-protocols',
    };
    return config;
  },
};

export default nextConfig;
