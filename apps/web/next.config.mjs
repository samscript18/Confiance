import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
loadEnvConfig(root);
process.env.CONFIANCE_PROJECT_ROOT = root;
export default {
  devIndicators: false,
  outputFileTracingRoot: root,
  serverExternalPackages: ["@privy-io/node"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
