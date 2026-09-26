import type { NextConfig } from "next";
import os from "os";

function lanOrigins() {
  const origins = new Set<string>();

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = entry.family as string | number;
      if ((family === "IPv4" || family === 4) && !entry.internal) {
        origins.add(entry.address);
      }
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins(),
};

export default nextConfig;
