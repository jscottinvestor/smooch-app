import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Receipt photos arrive base64-encoded as a server-action argument. The
      // client resizes to ~2000px JPEG (well under this), so 4MB is a safety
      // backstop, not a target.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
