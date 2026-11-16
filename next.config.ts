import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  // جذر المشروع صريح، حتى لو فيه package-lock.json في مجلد أعلى (مثل مجلد المستخدم)
  turbopack: { root: path.resolve(".") },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default config;
