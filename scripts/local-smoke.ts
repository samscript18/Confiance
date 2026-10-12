import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseUnits,
  decodeEventLog,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  confianceAbi,
  confianceBytecode,
  demoTokenAbi,
  demoTokenBytecode,
} from "../packages/shared/contracts.js";
import { contractError } from "../packages/shared/errors.js";
import { json } from "../packages/shared/config.js";

const chain = defineChain({
  id: 31337,
  name: "Local Anvil",
  nativeCurrency: { name: "Test Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:18545"] } },
});
const rpc = chain.rpcUrls.default.http[0];
// Fresh local keys, held in memory only. No borrowed real wallet or owner key.
const owner = privateKeyToAccount(generatePrivateKey());
const agent = privateKeyToAccount(generatePrivateKey());
const recipient = privateKeyToAccount(generatePrivateKey()).address;
const publicClient = createPublicClient({ chain, transport: http(rpc) });
const ownerClient = createWalletClient({
  account: owner,
  chain,
  transport: http(rpc),
});
const agentClient = createWalletClient({
  account: agent,
  chain,
  transport: http(rpc),
});
const anvil = spawn(
  "anvil",
  ["--host", "127.0.0.1", "--port", "18545", "--chain-id", "31337", "--silent"],
  { stdio: "ignore" },
);
let spawnError: Error | undefined;
anvil.on("error", (error) => {
  spawnError = error;
});
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (spawnError) throw spawnError;
    if (anvil.exitCode !== null)
      throw new Error("Anvil exited; ensure port 18545 is available.");
    try {
      ready = (await publicClient.getChainId()) === 31337;
    } catch {
      /* Wait for this local process to start. */
    }
    if (ready) break;
    await delay(100);
  }
  assert(ready, "Local Anvil failed to start");
  for (const address of [owner.address, agent.address]) {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "anvil_setBalance",
        params: [address, "0x56bc75e2d63100000"],
      }),
    });
    const result = (await response.json()) as { error?: unknown };
    assert(!result.error, "Could not fund local-only signer");
  }
  async function receipt(hash: Hex) {
    const result = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(result.status, "success");
    return result;
  }
  const deployment = await receipt(
    await ownerClient.deployContract({
      abi: confianceAbi,
      bytecode: confianceBytecode,
      args: [owner.address],
    }),
  );
  assert(deployment.contractAddress);
  const account = deployment.contractAddress;
  const tokenDeployment = await receipt(
    await ownerClient.deployContract({
      abi: demoTokenAbi,
      bytecode: demoTokenBytecode,
      args: [account],
    }),
  );
  assert(tokenDeployment.contractAddress);
  const asset = tokenDeployment.contractAddress;
  await receipt(
    await ownerClient.writeContract({
      address: account,
      abi: confianceAbi,
      functionName: "registerAgent",
      args: [agent.address, ("0x" + "11".repeat(32)) as Hex],
    }),
  );
  const block = await publicClient.getBlock();
  const policy = {
    allowedAsset: asset,
    allowedRecipient: recipient,
    spendingLimit: parseUnits("50", 6),
    expiry: block.timestamp + 86400n,
    complianceAdapter: "0x0000000000000000000000000000000000000000" as const,
    requiredCondition: ("0x" + "00".repeat(32)) as Hex,
  };
  await receipt(
    await ownerClient.writeContract({
      address: account,
      abi: confianceAbi,
      functionName: "createSession",
      args: [agent.address, policy],
    }),
  );
  const paymentHash = await agentClient.writeContract({
    address: account,
    abi: confianceAbi,
    functionName: "executePayment",
    args: [recipient, asset, parseUnits("30", 6), 0n, 1n],
  });
  const payment = await receipt(paymentHash);
  const transaction = await publicClient.getTransaction({ hash: paymentHash });
  assert.equal(transaction.from.toLowerCase(), agent.address.toLowerCase());
  const balance = await publicClient.readContract({
    address: asset,
    abi: demoTokenAbi,
    functionName: "balanceOf",
    args: [recipient],
  });
  assert.equal(balance, parseUnits("30", 6));
  assert(
    payment.logs.some((log) => {
      try {
        return (
          decodeEventLog({
            abi: confianceAbi,
            data: log.data,
            topics: log.topics,
          }).eventName === "PaymentExecuted"
        );
      } catch {
        return false;
      }
    }),
  );

  async function reject(amount: bigint, nonce: bigint, expected: string) {
    await assert.rejects(
      publicClient.simulateContract({
        account: agent.address,
        address: account,
        abi: confianceAbi,
        functionName: "executePayment",
        args: [recipient, asset, amount, nonce, 1n],
      }),
      (error: unknown) => contractError(error).code === expected,
    );
    // Also force a real local transaction: receipt must be reverted, with zero surviving logs.
    const hash = await agentClient.writeContract({
      address: account,
      abi: confianceAbi,
      functionName: "executePayment",
      args: [recipient, asset, amount, nonce, 1n],
      gas: 200000n,
    });
    const result = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(result.status, "reverted");
    assert.equal(result.logs.length, 0);
    return { hash, block: result.blockNumber, reason: expected };
  }
  const overLimit = await reject(
    parseUnits("500", 6),
    1n,
    "SESSION_SPENDING_LIMIT",
  );
  const replay = await reject(parseUnits("1", 6), 0n, "INVALID_NONCE");
  const revoke = await receipt(
    await ownerClient.writeContract({
      address: account,
      abi: confianceAbi,
      functionName: "revokeSession",
      args: [agent.address],
    }),
  );
  const revoked = await reject(parseUnits("30", 6), 1n, "SESSION_REVOKED");
  assert.equal(
    await publicClient.readContract({
      address: asset,
      abi: demoTokenAbi,
      functionName: "balanceOf",
      args: [recipient],
    }),
    balance,
  );
  const proof = {
    network: "LOCAL ANVIL ONLY — not Monad, not LLM, not Privy, not compliance",
    chainId: 31337,
    owner: owner.address,
    agent: agent.address,
    recipient,
    account,
    asset,
    payment: {
      hash: paymentHash,
      block: payment.blockNumber,
      sender: transaction.from,
      amount: "30 CTT",
    },
    overLimit,
    replay,
    revocation: revoke.transactionHash,
    revoked,
  };
  await mkdir("proofs", { recursive: true });
  await writeFile("proofs/local-smoke.json", json(proof));
  console.log(json(proof));
  console.log(
    "PASS: separate signer payment; over-limit, replay and same-key post-revocation transactions reverted.",
  );
} finally {
  anvil.kill("SIGTERM");
}
