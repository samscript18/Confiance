import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  erc20Abi,
  http,
  type Hex,
} from "viem";
import { confianceAbi } from "../packages/shared/contracts.js";
import {
  address,
  assertMonad,
  required,
  rpcUrl,
  targetChain,
} from "../packages/shared/config.js";
import { parseExactAmount } from "./tools/amount.js";
/** Revalidate exact settlement when recovering a completed task after restart. */
export async function verifyConfiguredPayment(
  env: NodeJS.ProcessEnv,
  hash: Hex,
) {
  const client = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl(env)),
  });
  assertMonad(await client.getChainId());
  const account = address(env, "CONFIANCE_ADDRESS"),
    recipient = address(env, "PAYMENT_RECIPIENT"),
    asset = address(env, "PAYMENT_ASSET");
  const decimals = await client.readContract({
    address: asset,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const amount = parseExactAmount(required(env, "PAYMENT_AMOUNT"), decimals);
  const [receipt, tx] = await Promise.all([
    client.getTransactionReceipt({ hash }),
    client.getTransaction({ hash }),
  ]);
  if (
    receipt.status !== "success" ||
    tx.to?.toLowerCase() !== account.toLowerCase()
  )
    throw new Error(
      "Stored task transaction is not a successful Confiance call.",
    );
  const call = decodeFunctionData({ abi: confianceAbi, data: tx.input });
  if (
    call.functionName !== "executePayment" ||
    call.args[0] !== recipient ||
    call.args[1] !== asset ||
    call.args[2] !== amount
  )
    throw new Error("Stored task calldata does not match payroll.");
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== account.toLowerCase()) continue;
    try {
      const event = decodeEventLog({
        abi: confianceAbi,
        data: log.data,
        topics: log.topics,
      });
      if (
        event.eventName === "PaymentExecuted" &&
        event.args.agent.toLowerCase() === tx.from.toLowerCase() &&
        event.args.recipient === recipient &&
        event.args.asset === asset &&
        event.args.amount === amount &&
        event.args.nonce === call.args[3] &&
        event.args.generation === call.args[4]
      )
        return { hash, block: receipt.blockNumber };
    } catch {
      /* Non-payment events cannot prove this payment. */
    }
  }
  throw new Error("Stored task has no matching execution event.");
}
