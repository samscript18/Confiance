import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  zeroAddress,
} from "viem";
import { confianceAbi } from "../../packages/shared/contracts.js";
import {
  address,
  assertMonad,
  json,
  required,
  rpcUrl,
  targetChain,
} from "../../packages/shared/config.js";
import { contractError } from "../../packages/shared/errors.js";
import { connectPrivy } from "../wallet/privy.js";
import { checkGithub } from "./github.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { payrollTaskId } from "../task.js";

import { parseExactAmount } from "./amount.js";
export { parseExactAmount } from "./amount.js";

export const toolNames = [
  "check_github_milestone",
  "check_payment_policy",
  "check_agent_session",
  "check_recipient",
  "check_balance",
  "request_payment",
] as const;
export type ToolName = (typeof toolNames)[number];
export const toolDefinitions = toolNames.map((name) => ({
  type: "function" as const,
  function: {
    name,
    description:
      name === "request_payment"
        ? "Request the fixed payroll payment through Confiance; only a verified receipt proves success."
        : `Read actual state: ${name}`,
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
      required: [],
    },
  },
}));

export async function createPayrollTools(env: NodeJS.ProcessEnv) {
  assertMonad(Number(required(env, "MONAD_CHAIN_ID")));
  const client = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl(env)),
  });
  assertMonad(await client.getChainId());
  const account = address(env, "CONFIANCE_ADDRESS");
  const asset = address(env, "PAYMENT_ASSET");
  const recipient = address(env, "PAYMENT_RECIPIENT");
  const repo = required(env, "GITHUB_REPO");
  const pr = Number(required(env, "GITHUB_PR_NUMBER"));
  const signer = await connectPrivy(env);
  const owner = await client.readContract({
    address: account,
    abi: confianceAbi,
    functionName: "owner",
  });
  if (owner.toLowerCase() === signer.address.toLowerCase())
    throw new Error("Agent signer must differ from owner.");
  const decimals = await client.readContract({
    address: asset,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const amount = parseExactAmount(required(env, "PAYMENT_AMOUNT"), decimals);
  const condition = keccak256(stringToHex(`github:${repo}:${pr}`));
  let paymentAttempted = false;
  const proofFolder = join(
    env.CONFIANCE_PROJECT_ROOT || process.cwd(),
    "proofs",
  );
  async function session() {
    return client.readContract({
      address: account,
      abi: confianceAbi,
      functionName: "getSession",
      args: [signer.address],
    });
  }
  const tools = {
    check_github_milestone: () => checkGithub(repo, pr, env.GITHUB_TOKEN),
    async check_payment_policy() {
      const state = await session();
      const verified =
        state.policy.requiredCondition === condition &&
        (await client.readContract({
          address: account,
          abi: confianceAbi,
          functionName: "verifiedConditions",
          args: [condition],
        }));
      return {
        ...state.policy,
        amount: formatUnits(amount, decimals),
        decimals,
        spent: formatUnits(state.spent, decimals),
        spendingLimit: formatUnits(state.policy.spendingLimit, decimals),
        denomination: "token units, not USD",
        conditionVerified: verified,
        expectedCondition: condition,
      };
    },
    async check_agent_session() {
      const state = await session();
      const block = await client.getBlock();
      const nonce = await client.readContract({
        address: account,
        abi: confianceAbi,
        functionName: "nonces",
        args: [signer.address],
      });
      return {
        owner,
        agent: signer.address,
        exists: state.exists,
        active: state.active,
        expired: state.policy.expiry <= block.timestamp,
        generation: state.generation,
        nonce,
      };
    },
    async check_recipient() {
      const state = await session();
      if (state.policy.complianceAdapter === zeroAddress)
        return {
          recipient,
          allowedByOwner:
            state.policy.allowedRecipient.toLowerCase() ===
            recipient.toLowerCase(),
          compliance: "No compliance adapter; no A-Pass/Cleanverse claim.",
        };
      const eligible = await client.readContract({
        address: state.policy.complianceAdapter,
        abi: parseAbi([
          "function checkRecipientEligibility(address) view returns (bool)",
        ]),
        functionName: "checkRecipientEligibility",
        args: [recipient],
      });
      return {
        recipient,
        eligible,
        adapter: state.policy.complianceAdapter,
        compliance:
          "Configured adapter; provider must be verified independently.",
      };
    },
    async check_balance() {
      const balance = await client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
      });
      return {
        treasury: formatUnits(balance, decimals),
        agentGas: await client.getBalance({ address: signer.address }),
        asset,
        sufficientTokens: balance >= amount,
      };
    },
    async request_payment() {
      if (paymentAttempted)
        return {
          status: "blocked",
          code: "ALREADY_ATTEMPTED",
          message:
            "Only one submission is permitted per agent run. Reconcile any pending receipt.",
        };
      paymentAttempted = true;
      let submittedHash: `0x${string}` | undefined;
      try {
        assertMonad(await client.getChainId());
        const state = await session();
        if (state.policy.requiredCondition !== condition)
          return {
            status: "blocked",
            code: "TASK_CONDITION_MISMATCH",
            message: "The onchain policy does not bind this GitHub task.",
          };
        const nonce = await client.readContract({
          address: account,
          abi: confianceAbi,
          functionName: "nonces",
          args: [signer.address],
        });
        const args = [
          recipient,
          asset,
          amount,
          nonce,
          state.generation,
        ] as const;
        // A contract call verifies authorization. Backend booleans grant no authority.
        await client.simulateContract({
          account: signer.address,
          address: account,
          abi: confianceAbi,
          functionName: "executePayment",
          args,
        });
        const gas = await client.estimateContractGas({
          account: signer.address,
          address: account,
          abi: confianceAbi,
          functionName: "executePayment",
          args,
        });
        const data = encodeFunctionData({
          abi: confianceAbi,
          functionName: "executePayment",
          args,
        });
        const id = `${targetChain.id}-${account}-${signer.address}-${state.generation}-${nonce}`;
        submittedHash = await signer.submitPayment(
          account,
          data,
          (gas * 110n + 99n) / 100n,
          id,
        );
        await mkdir(proofFolder, { recursive: true });
        await writeFile(
          join(proofFolder, `${submittedHash}.json`),
          json({
            status: "submitted",
            hash: submittedHash,
            chainId: targetChain.id,
            owner,
            agent: signer.address,
            account,
            recipient,
            asset,
            amount,
            nonce,
            generation: state.generation,
            taskId: payrollTaskId(env),
          }),
        );
        const receipt = await client.waitForTransactionReceipt({
          hash: submittedHash,
          confirmations: 2,
          timeout: 120000,
        });
        if (receipt.status !== "success")
          return {
            status: "reverted",
            transactionHash: submittedHash,
            message: "The submitted transaction reverted onchain.",
          };
        const transaction = await client.getTransaction({
          hash: submittedHash,
        });
        if (
          transaction.from.toLowerCase() !== signer.address.toLowerCase() ||
          transaction.to?.toLowerCase() !== account.toLowerCase() ||
          transaction.input !== data
        )
          throw new Error(
            "Transaction sender or calldata did not match the authorized request.",
          );
        const executed = receipt.logs.some((log) => {
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
              event.args.generation === state.generation
            );
          } catch {
            return false;
          }
        });
        if (!executed)
          throw new Error("Receipt has no matching PaymentExecuted event.");
        const proof = {
          status: "executed",
          taskId: payrollTaskId(env),
          chainId: targetChain.id,
          transactionHash: submittedHash,
          blockNumber: receipt.blockNumber,
          sender: transaction.from,
          recipient,
          asset,
          amount: formatUnits(amount, decimals),
          explorer: `${targetChain.blockExplorers.default.url}/tx/${submittedHash}`,
        };
        await writeFile(
          join(proofFolder, `${submittedHash}.json`),
          json(proof),
        );
        return proof;
      } catch (error) {
        return submittedHash
          ? {
              status: "submitted_unverified",
              transactionHash: submittedHash,
              message:
                "Submission exists but success is not verified. Reconcile the receipt before retrying.",
            }
          : { status: "blocked", ...contractError(error) };
      }
    },
  };
  return { agent: signer.address, owner, tools };
}
