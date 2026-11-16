import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default config;
