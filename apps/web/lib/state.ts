export interface DashboardState {
  network: "Monad Testnet";
  chainId: 10143;
  configured: boolean;
  authenticated?: boolean;
  error?: string;
  owner?: `0x${string}`;
  ownerConsoleUrl?: string;
  account?: `0x${string}`;
  agent?: `0x${string}`;
  asset?: `0x${string}`;
  taskAsset?: `0x${string}`;
  agentWalletConnected?: boolean;
  diagnosticRecipientConfigured?: boolean;
  setupCapabilities?: { privy: boolean; identity: boolean };
  recipient?: `0x${string}`;
  registry?: `0x${string}`;
  identity?: { id: string; owner: string; wallet: string; uri: string };
  symbol?: string;
  decimals?: number;
  balance?: string;
  agentGas?: string;
  cleanverseSetup?: import("../../../packages/shared/cleanverse-policy.js").CleanversePolicySetup;
  cleanverseSetupError?: string;
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
  taskMilestone?: {
    repo: string;
    pr: number;
    condition: string;
    verified?: boolean;
  };
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
  savedTask?: boolean;
  workerTranscript?: { kind: string; content: string; name?: string }[];
  monitoring?: { enabled: boolean; updatedAt: string };
  worker?: { status: string; heartbeat: string };
  rejections?: { hash: string; reason: string; block: string }[];
  reporter?: { forwarder: string; workflowId: string; workflowOwner: string };
  reporterSetup?: {
    forwarder: string;
    workflowId: string;
    workflowOwner: string;
  };
}
