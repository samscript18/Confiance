import { defineChain } from "viem";
// Values verified against viem 2.57.4's Monad testnet definition. A dedicated
// definition avoids bundling unrelated chain runtimes into the dashboard.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  blockTime: 400,
  nativeCurrency: { name: "Testnet MON Token", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: {
      name: "Monad Testnet explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});
