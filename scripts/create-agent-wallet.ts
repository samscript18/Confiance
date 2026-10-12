import { PrivyClient } from "@privy-io/node";
import { required, json } from "../packages/shared/config.js";
import { loadRuntimeEnv } from "../agent/config.js";
import { mkdir, writeFile } from "node:fs/promises";
import { getAddress, isAddress } from "viem";

try {
  const env = await loadRuntimeEnv(process.env);
  const client = new PrivyClient({
    appId: required(env, "PRIVY_APP_ID"),
    appSecret: required(env, "PRIVY_APP_SECRET"),
  });
  const existing = env.PRIVY_AGENT_WALLET_ID;
  const wallet = existing
    ? await client.wallets().get(existing)
    : await client.wallets().create({
        chain_type: "ethereum",
        display_name: "Confiance Payroll Agent",
        idempotency_key: "confiance-payroll-agent-v1",
      });
  if (wallet.chain_type !== "ethereum" || !isAddress(wallet.address))
    throw new Error("Ethereum wallet required.");
  if (
    env.CONFIANCE_OWNER &&
    getAddress(wallet.address) === getAddress(env.CONFIANCE_OWNER)
  )
    throw new Error("Agent must differ from owner.");
  await mkdir("deployments", { recursive: true });
  await writeFile(
    "deployments/agent-wallet.json",
    json({ id: wallet.id, address: getAddress(wallet.address) }),
  );
  console.log(
    json({
      walletId: wallet.id,
      agentAddress: wallet.address,
      action:
        "Set PRIVY_AGENT_WALLET_ID in .env. Fund this separate agent address with testnet MON for gas. This does not create a Confiance session.",
    }),
  );
} catch {
  console.error(
    "Privy wallet provisioning unavailable. Configure a Privy app and credentials; no wallet was claimed as created.",
  );
  process.exitCode = 1;
}
