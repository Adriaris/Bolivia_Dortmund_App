import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.133', '192.168.1.142'],
  images: {
    // El escudo se sirve a quality 100 en splash/header (next/image lo exige explícito en Next 16)
    qualities: [75, 100],
  },
};

export default nextConfig;
