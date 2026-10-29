/** @type {import('next').NextConfig} */
const nextConfig = {
  // The landing page is a hand-built WebGL page in public/landing.html; serve it at the root.
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
  // the room and its password page are read from deep/ at request time (see app/deep/route.js)
  outputFileTracingIncludes: { "/deep": ["./deep/**"] },
};

export default nextConfig;
