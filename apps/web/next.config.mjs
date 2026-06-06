/** @type {import('next').NextConfig} */
const nextConfig = {
  // @swarm/shared ships raw .ts; transpile it rather than expecting prebuilt JS.
  transpilePackages: ['@swarm/shared'],
  typescript: {
    // Type-checking runs via `tsc`/CI separately; don't block the showpiece build
    // on cross-package .ts extension resolution quirks.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
