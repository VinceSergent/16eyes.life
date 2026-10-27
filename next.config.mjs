/** @type {import('next').NextConfig} */
const nextConfig = {
  // The landing page is a hand-built WebGL page in public/landing.html; serve it at the root.
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};

export default nextConfig;
