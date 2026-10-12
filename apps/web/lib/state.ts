export interface DashboardState {
  network: "Monad Testnet";
  chainId: 10143;
  configured: boolean;
  error?: string;
  owner?: `0x${string}`;
  account?: `0x${string}`;
  agent?: `0x${string}`;
  asset?: `0x${string}`;
  recipient?: `0x${string}`;
  registry?: `0x${string}`;
  identity?: { id: string; owner: string; wallet: string; uri: string };
  symbol?: string;
  decimals?: number;
  balance?: string;
  agentGas?: string;
  session?: {
    exists: boolean;
    active: boolean;
    expired: boolean;
    generation: string;
    spent: string;
    limit: string;
    remaining: string;
    expiry: string;
    condition: string;
    verified: boolean;
    adapter: string;
  };
  github?: { repo: string; pr: number; state: string; merged: boolean };
  events: {
    id: string;
    kind: string;
    hash: string;
    block: string;
    agent?: string;
    amount?: string;
    asset?: string;
  }[];
  historySource: "Envio" | "Monad RPC" | "unavailable";
  readiness: { name: string; ready: boolean; detail: string }[];
  taskAmount: string;
  rejections?: { hash: string; reason: string; block: string }[];
  reporter?: { forwarder: string; workflowId: string; workflowOwner: string };
  reporterSetup?: {
    forwarder: string;
    workflowId: string;
    workflowOwner: string;
  };
}
