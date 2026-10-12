import { mkdir, open, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicClient, encodeFunctionData, erc20Abi, http } from "viem";
import { confianceAbi } from "../packages/shared/contracts.js";
import {
  address,
  assertMonad,
  json,
  rpcUrl,
  targetChain,
} from "../packages/shared/config.js";
import { contractError } from "../packages/shared/errors.js";
import { connectPrivy } from "./wallet/privy.js";
import { parseExactAmount } from "./tools/amount.js";
export const attacks = {
  "attack-limit": { amount: "500", expected: "SESSION_SPENDING_LIMIT" },
  "attack-condition": { amount: "30", expected: "CONDITION_NOT_VERIFIED" },
  "attack-recipient": { amount: "30", expected: "RECIPIENT_NOT_ELIGIBLE" },
  "attack-revoked": { amount: "30", expected: "SESSION_REVOKED" },
} as const;
export async function runAttack(
  env: NodeJS.ProcessEnv,
  mode: keyof typeof attacks,
) {
  const folder = join(env.CONFIANCE_PROJECT_ROOT || process.cwd(), "proofs");
  await mkdir(folder, { recursive: true });
  const path = join(folder, "payroll.lock");
  const lock = await open(path, "wx").catch(() => {
    throw new Error("Another agent operation is running.");
  });
  try {
    const client = createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl(env)),
    });
    assertMonad(await client.getChainId());
    const account = address(env, "CONFIANCE_ADDRESS"),
      asset = address(env, "PAYMENT_ASSET");
    const recipient = address(
      env,
      mode === "attack-recipient"
        ? "DIAGNOSTIC_RECIPIENT"
        : "PAYMENT_RECIPIENT",
    );
    const signer = await connectPrivy(env);
    const owner = await client.readContract({
      address: account,
      abi: confianceAbi,
      functionName: "owner",
    });
    if (owner === signer.address)
      throw new Error("Independent agent required.");
    const session = await client.readContract({
      address: account,
      abi: confianceAbi,
      functionName: "getSession",
      args: [signer.address],
    });
    const nonce = await client.readContract({
      address: account,
      abi: confianceAbi,
      functionName: "nonces",
      args: [signer.address],
    });
    const decimals = await client.readContract({
      address: asset,
      abi: erc20Abi,
      functionName: "decimals",
    });
    const amount = parseExactAmount(attacks[mode].amount, decimals);
    const args = [recipient, asset, amount, nonce, session.generation] as const;
    let rejection: ReturnType<typeof contractError> | undefined;
    try {
      await client.simulateContract({
        address: account,
        account: signer.address,
        abi: confianceAbi,
        functionName: "executePayment",
        args,
      });
    } catch (error) {
      rejection = contractError(error);
    }
    if (rejection?.code !== attacks[mode].expected)
      throw new Error(
        "Expected rejection is absent. Diagnostic refuses to submit a potentially allowed payment.",
      );
    const data = encodeFunctionData({
      abi: confianceAbi,
      functionName: "executePayment",
      args,
    });
    const hash = await signer.submitPayment(
      account,
      data,
      200000n,
      `${mode}-${account}-${signer.address}-${session.generation}-${nonce}`,
    );
    const proofPath = join(folder, `${hash}.json`);
    await writeFile(
      proofPath,
      json({
        status: "submitted",
        hash,
        type: "deterministic security diagnostic",
        account,
        agent: signer.address,
      }),
    );
    const receipt = await client.waitForTransactionReceipt({
      hash,
      confirmations: 2,
      timeout: 120000,
    });
    const tx = await client.getTransaction({ hash });
    if (
      receipt.status !== "reverted" ||
      receipt.logs.length !== 0 ||
      tx.from.toLowerCase() !== signer.address.toLowerCase() ||
      tx.to?.toLowerCase() !== account.toLowerCase() ||
      tx.input !== data
    )
      throw new Error(
        "Diagnostic result differs from the intended rejected transaction. Review the submitted hash.",
      );
    const proof = {
      type: "deterministic security diagnostic; not LLM reasoning",
      status: "reverted",
      hash,
      block: receipt.blockNumber.toString(),
      chainId: 10143,
      sender: tx.from,
      account,
      recipient,
      asset,
      amount: attacks[mode].amount,
      reason: rejection.code,
      reasonSource: "pre-submission onchain simulation; receipt proves revert",
      explorer: `${targetChain.blockExplorers.default.url}/tx/${hash}`,
    };
    await writeFile(proofPath, json(proof));
    return proof;
  } finally {
    await lock.close();
    await unlink(path);
  }
}
