import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  erc20Abi,
  http,
} from "viem";
import { mkdir, writeFile } from "node:fs/promises";
import { confianceAbi } from "../packages/shared/contracts.js";
import {
  address,
  assertMonad,
  json,
  required,
  rpcUrl,
  targetChain,
} from "../packages/shared/config.js";
import { contractError } from "../packages/shared/errors.js";
import { connectPrivy } from "../agent/wallet/privy.js";
import { parseExactAmount } from "../agent/tools/payroll.js";

import { loadRuntimeEnv } from "../agent/config.js";
const env = await loadRuntimeEnv(process.env);

// Explicit security demo, NOT an LLM decision. This is not exposed as an agent tool or HTTP endpoint.
try {
  assertMonad(Number(required(env, "MONAD_CHAIN_ID")));
  const client = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl(env)),
  });
  assertMonad(await client.getChainId());
  const account = address(env, "CONFIANCE_ADDRESS");
  const asset = address(env, "PAYMENT_ASSET");
  const recipient = address(
    env,
    process.argv.includes("--wrong-recipient")
      ? "DIAGNOSTIC_RECIPIENT"
      : "PAYMENT_RECIPIENT",
  );
  const amountText = process.argv[2];
  if (!amountText || amountText.startsWith("--"))
    throw new Error(
      "Usage: agent-diagnostic.ts <token amount> [--submit] [--replay] [--wrong-recipient]",
    );
  const decimals = await client.readContract({
    address: asset,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const amount = parseExactAmount(amountText, decimals);
  const signer = await connectPrivy(env);
  const owner = await client.readContract({
    address: account,
    abi: confianceAbi,
    functionName: "owner",
  });
  if (owner.toLowerCase() === signer.address.toLowerCase())
    throw new Error("Owner cannot serve as agent.");
  const session = await client.readContract({
    address: account,
    abi: confianceAbi,
    functionName: "getSession",
    args: [signer.address],
  });
  let nonce = await client.readContract({
    address: account,
    abi: confianceAbi,
    functionName: "nonces",
    args: [signer.address],
  });
  if (process.argv.includes("--replay")) {
    if (nonce === 0n) throw new Error("No consumed nonce exists to replay.");
    nonce -= 1n;
  }
  const args = [recipient, asset, amount, nonce, session.generation] as const;
  let diagnostic: ReturnType<typeof contractError> | undefined;
  try {
    await client.simulateContract({
      account: signer.address,
      address: account,
      abi: confianceAbi,
      functionName: "executePayment",
      args,
    });
  } catch (error) {
    diagnostic = contractError(error);
  }
  if (!process.argv.includes("--submit")) {
    console.log(
      json({
        type: "deterministic security diagnostic, not AI reasoning",
        status: diagnostic ? "simulation_rejected" : "simulation_allowed",
        diagnostic,
        note: "No transaction was submitted. No settlement claimed.",
      }),
    );
  } else {
    const data = encodeFunctionData({
      abi: confianceAbi,
      functionName: "executePayment",
      args,
    });
    const gas = diagnostic
      ? 200000n
      : ((await client.estimateContractGas({
          account: signer.address,
          address: account,
          abi: confianceAbi,
          functionName: "executePayment",
          args,
        })) *
          110n) /
        100n;
    const id = `diagnostic-${targetChain.id}-${account}-${signer.address}-${session.generation}-${nonce}-${amount}-${recipient}`;
    const hash = await signer.submitPayment(account, data, gas, id);
    await mkdir("proofs", { recursive: true });
    await writeFile(
      `proofs/${hash}.json`,
      json({
        status: "submitted",
        hash,
        type: "deterministic security diagnostic",
      }),
    );
    console.log(json({ status: "submitted_unverified", hash }));
    const receipt = await client.waitForTransactionReceipt({
      hash,
      confirmations: 2,
      timeout: 120000,
    });
    const transaction = await client.getTransaction({ hash });
    if (
      transaction.from.toLowerCase() !== signer.address.toLowerCase() ||
      transaction.to?.toLowerCase() !== account.toLowerCase() ||
      transaction.input !== data
    )
      throw new Error("Unexpected transaction sender/target/calldata.");
    const matchingEvent = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== account.toLowerCase()) return false;
      try {
        const event = decodeEventLog({
          abi: confianceAbi,
          data: log.data,
          topics: log.topics,
        });
        return (
          event.eventName === "PaymentExecuted" &&
          event.args.agent.toLowerCase() === signer.address.toLowerCase() &&
          event.args.recipient.toLowerCase() === recipient.toLowerCase() &&
          event.args.asset.toLowerCase() === asset.toLowerCase() &&
          event.args.amount === amount &&
          event.args.nonce === nonce &&
          event.args.generation === session.generation
        );
      } catch {
        return false;
      }
    });
    if (receipt.status === "success" && !matchingEvent)
      throw new Error("Missing expected execution event.");
    const proof = {
      type: "deterministic security diagnostic, not autonomous LLM proof",
      status: receipt.status === "success" ? "executed" : "reverted",
      chainId: targetChain.id,
      hash,
      blockNumber: receipt.blockNumber,
      sender: transaction.from,
      recipient,
      asset,
      amountRaw: amount,
      nonce,
      generation: session.generation,
      preSubmissionSimulation: diagnostic ?? null,
      explorer: `${targetChain.blockExplorers.default.url}/tx/${hash}`,
    };
    await writeFile(`proofs/${hash}.json`, json(proof));
    console.log(json(proof));
  }
} catch {
  console.error(
    "Diagnostic unavailable or unverified. No successful execution claimed. Reconcile any printed submission hash before retrying.",
  );
  process.exitCode = 1;
}
