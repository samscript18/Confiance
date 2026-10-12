import { defineConfig } from "@playwright/test";
// Public test-fixture owner only; browser tests never connect a funded account/provider.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3021", headless: true },
  webServer: {
    command: "npm run start --workspace @confiance/web -- --port 3021",
    url: "http://localhost:3021",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      CONFIANCE_OWNER: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
      CONFIANCE_ADDRESS: "",
      WEB_ORIGIN: "http://localhost:3021",
      PRIVY_APP_ID: "",
      PRIVY_APP_SECRET: "",
      PRIVY_AGENT_WALLET_ID: "",
      AGENT_ADDRESS: "",
      PAYMENT_ASSET: "",
      PAYMENT_RECIPIENT: "",
      ERC8004_AGENT_ID: "",
      ERC8004_IDENTITY_REGISTRY: "",
      CONFIANCE_PROJECT_ROOT: "/private/tmp/confiance-browser-fixture",
    },
  },
});
