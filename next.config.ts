import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Configurazione per Prisma standalone
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
