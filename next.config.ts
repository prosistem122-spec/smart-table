import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E / smoke usam 127.0.0.1; evita aviso de cross-origin no Dev
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
