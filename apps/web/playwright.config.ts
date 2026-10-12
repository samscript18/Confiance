import { defineConfig } from "@playwright/test";
// Public test-fixture owner only; browser tests never connect a funded account/provider.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3000", headless: true },
  webServer: {
    command: "npm run dev --workspace @confiance/web",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      CONFIANCE_OWNER: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
      CONFIANCE_ADDRESS: "",
      WEB_ORIGIN: "http://localhost:3000",
    },
  },
});
