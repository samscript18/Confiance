import { erc20Abi, formatUnits, zeroAddress, zeroHash } from "viem";
import { confianceAbi } from "../../../../../packages/shared/contracts";
import { identityAbi } from "../../../../../packages/shared/identity";
import { address } from "../../../../../packages/shared/config";
import { checkGithub } from "../../../../../agent/tools/github";
import { checkedClient, publicResponse } from "../../../lib/server";
import { runtimeEnv } from "../../../lib/settings";
import { connectPrivy } from "../../../../../agent/wallet/privy";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { isHex } from "viem";
import type { DashboardState } from "../../../lib/state";
import { parseReporterSettings } from "../../../../../packages/shared/reporter";
export const runtime = "nodejs";
export async function GET() {
  const state: DashboardState = {
    network: "Monad Testnet",
    chainId: 10143,
    configured: false,
    events: [],
    historySource: "unavailable",
    readiness: [],
    taskAmount: process.env.PAYMENT_AMOUNT || "30",
  };
  try {
    const env = await runtimeEnv();
    if (
      env.CHAINLINK_CRE_FORWARDER &&
      env.CHAINLINK_CRE_WORKFLOW_ID &&
      env.CHAINLINK_CRE_WORKFLOW_OWNER
    ) {
      try {
        state.reporterSetup = parseReporterSettings({
          forwarder: env.CHAINLINK_CRE_FORWARDER,
          workflowId: env.CHAINLINK_CRE_WORKFLOW_ID,
          workflowOwner: env.CHAINLINK_CRE_WORKFLOW_OWNER,
        });
      } catch {
        // Malformed setup metadata cannot become a signing suggestion.
      }
    }
    state.readiness = [
      {
        name: "Privy",
        ready: Boolean(
          env.PRIVY_APP_ID && env.PRIVY_APP_SECRET && env.PRIVY_AGENT_WALLET_ID,
        ),
        detail: "Separate agent signer",
      },
      {
        name: "AI runtime",
        ready:
          env.LLM_PROVIDER === "vertex"
            ? Boolean(
                env.VERTEX_PROJECT_ID && env.VERTEX_LOCATION && env.LLM_MODEL,
              )
            : Boolean(env.LLM_BASE_URL && env.LLM_MODEL && env.LLM_API_KEY),
        detail: "Configured LLM provider",
      },
      {
        name: "CRE",
        ready: Boolean(
          env.CHAINLINK_CRE_FORWARDER &&
            env.CHAINLINK_CRE_WORKFLOW_ID &&
            env.CHAINLINK_CRE_WORKFLOW_OWNER,
        ),
        detail: "Reporting configuration; live delivery must be verified",
      },
      {
        name: "Cleanverse",
        ready: false,
        detail:
          "Validator documented; account/CVI enrollment and compliant transfer pending",
      },
      {
        name: "Envio",
        ready: Boolean(env.ENVIO_GRAPHQL_URL),
        detail: "History endpoint configured",
      },
    ];
    if (env.CONFIANCE_OWNER) state.owner = address(env, "CONFIANCE_OWNER");
    if (env.AGENT_ADDRESS) state.agent = address(env, "AGENT_ADDRESS");
    if (env.PRIVY_APP_ID && env.PRIVY_APP_SECRET && env.PRIVY_AGENT_WALLET_ID)
      state.agent = (await connectPrivy(env)).address;
    if (env.PAYMENT_ASSET) state.asset = address(env, "PAYMENT_ASSET");
    if (env.PAYMENT_RECIPIENT)
      state.recipient = address(env, "PAYMENT_RECIPIENT");
    if (env.ERC8004_IDENTITY_REGISTRY)
      state.registry = address(env, "ERC8004_IDENTITY_REGISTRY");
    if (!env.CONFIANCE_ADDRESS) return publicResponse(state);
    const client = await checkedClient();
    state.account = address(env, "CONFIANCE_ADDRESS");
    if (!(await client.getCode({ address: state.account })))
      throw new Error("Configured account has no code.");
    state.owner = await client.readContract({
      address: state.account,
      abi: confianceAbi,
      functionName: "owner",
    });
    state.configured = true;
    state.reporter = await client
      .readContract({
        address: state.account,
        abi: confianceAbi,
        functionName: "reporter",
      })
      .then(([forwarder, workflowId, workflowOwner]) => ({
        forwarder,
        workflowId,
        workflowOwner,
      }));
    if (state.agent) {
      const session = await client.readContract({
        address: state.account,
        abi: confianceAbi,
        functionName: "getSession",
        args: [state.agent],
      });
      const block = await client.getBlock();
      state.agentGas = formatUnits(
        await client.getBalance({ address: state.agent }),
        18,
      );
      if (session.exists) {
        state.asset = session.policy.allowedAsset;
        state.recipient = session.policy.allowedRecipient;
        const decimals = await client.readContract({
          address: state.asset,
          abi: erc20Abi,
          functionName: "decimals",
        });
        const [symbol, balance, verified] = await Promise.all([
          client.readContract({
            address: state.asset,
            abi: erc20Abi,
            functionName: "symbol",
          }),
          client.readContract({
            address: state.asset,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [state.account],
          }),
          session.policy.requiredCondition === zeroHash
            ? Promise.resolve(false)
            : client.readContract({
                address: state.account,
                abi: confianceAbi,
                functionName: "verifiedConditions",
                args: [session.policy.requiredCondition],
              }),
        ]);
        state.decimals = decimals;
        state.symbol = symbol;
        state.balance = formatUnits(balance, decimals);
        state.session = {
          exists: true,
          active: session.active,
          expired: session.policy.expiry <= block.timestamp,
          generation: session.generation.toString(),
          spent: formatUnits(session.spent, decimals),
          limit: formatUnits(session.policy.spendingLimit, decimals),
          remaining: formatUnits(
            session.policy.spendingLimit - session.spent,
            decimals,
          ),
          expiry: session.policy.expiry.toString(),
          condition: session.policy.requiredCondition,
          verified,
          adapter: session.policy.complianceAdapter,
        };
      }
    }
    if (state.registry && env.ERC8004_AGENT_ID) {
      const id = BigInt(env.ERC8004_AGENT_ID);
      const [owner, wallet, uri] = await Promise.all([
        client.readContract({
          address: state.registry,
          abi: identityAbi,
          functionName: "ownerOf",
          args: [id],
        }),
        client.readContract({
          address: state.registry,
          abi: identityAbi,
          functionName: "getAgentWallet",
          args: [id],
        }),
        client.readContract({
          address: state.registry,
          abi: identityAbi,
          functionName: "tokenURI",
          args: [id],
        }),
      ]);
      state.identity = { id: id.toString(), owner, wallet, uri };
    }
    if (env.GITHUB_REPO && env.GITHUB_PR_NUMBER) {
      try {
        const github = await checkGithub(
          env.GITHUB_REPO,
          Number(env.GITHUB_PR_NUMBER),
          env.GITHUB_TOKEN,
        );
        state.github = {
          repo: env.GITHUB_REPO,
          pr: Number(env.GITHUB_PR_NUMBER),
          state: github.state,
          merged: github.merged,
        };
      } catch {
        /* GitHub unavailability is represented by absence, never assumed merged. */
      }
    }
    if (env.ENVIO_GRAPHQL_URL) {
      try {
        const url = new URL(env.ENVIO_GRAPHQL_URL);
        if (
          url.protocol !== "https:" &&
          !(
            url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname)
          )
        )
          throw new Error("Invalid indexer URL.");
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query:
              "query History($account: String!) { Activity(where: {account: {_eq: $account}, chainId: {_eq: 10143}}, order_by: {block: desc}, limit: 40) { id kind hash block agent amount asset } }",
            variables: { account: state.account.toLowerCase() },
          }),
          signal: AbortSignal.timeout(10000),
        });
        const result: unknown = await response.json();
        if (
          !response.ok ||
          !result ||
          typeof result !== "object" ||
          !("data" in result) ||
          !result.data ||
          typeof result.data !== "object" ||
          !("Activity" in result.data) ||
          !Array.isArray(result.data.Activity)
        )
          throw new Error("Indexer unavailable.");
        for (const item of result.data.Activity) {
          if (
            !item ||
            typeof item !== "object" ||
            typeof item.id !== "string" ||
            typeof item.kind !== "string" ||
            typeof item.hash !== "string" ||
            !/^0x[0-9a-f]{64}$/i.test(item.hash) ||
            !/^\d+$/.test(String(item.block))
          )
            throw new Error("Invalid history.");
          state.events.push({
            id: item.id,
            kind: item.kind,
            hash: item.hash,
            block: String(item.block),
            ...(typeof item.agent === "string" ? { agent: item.agent } : {}),
            ...(typeof item.amount === "string" && /^\d+$/.test(item.amount)
              ? { amount: item.amount }
              : {}),
            ...(typeof item.asset === "string" ? { asset: item.asset } : {}),
          });
        }
        state.historySource = "Envio";
      } catch {
        state.events =
          []; /* Fall back to chain logs, never fabricate history. */
      }
    }
    if (state.historySource !== "Envio" && env.CONFIANCE_DEPLOYMENT_BLOCK) {
      const head = await client.getBlockNumber();
      // Bounded recent view; complete history is supplied by Envio.
      const from =
        BigInt(env.CONFIANCE_DEPLOYMENT_BLOCK) > head - 2000n
          ? BigInt(env.CONFIANCE_DEPLOYMENT_BLOCK)
          : head > 2000n
            ? head - 2000n
            : 0n;
      const logs = await client.getContractEvents({
        address: state.account,
        abi: confianceAbi,
        fromBlock: from,
        toBlock: head,
      });
      state.events = logs
        .slice(-40)
        .reverse()
        .map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          kind: log.eventName || "Contract event",
          hash: log.transactionHash,
          block: log.blockNumber.toString(),
          ...("amount" in log.args && typeof log.args.amount === "bigint"
            ? { amount: log.args.amount.toString() }
            : {}),
          ...("asset" in log.args && typeof log.args.asset === "string"
            ? { asset: log.args.asset }
            : {}),
        }));
      state.historySource = "Monad RPC";
    }
    state.rejections = [];
    const proofFolder = join(
      env.CONFIANCE_PROJECT_ROOT || process.cwd(),
      "proofs",
    );
    const files = await readdir(proofFolder).catch(() => []);
    for (const file of files
      .filter((file) => /^0x[0-9a-f]{64}\.json$/i.test(file))
      .slice(-10)) {
      try {
        const proof: unknown = JSON.parse(
          await readFile(join(proofFolder, file), "utf8"),
        );
        if (
          !proof ||
          typeof proof !== "object" ||
          !("status" in proof) ||
          proof.status !== "reverted" ||
          !("chainId" in proof) ||
          proof.chainId !== 10143
        )
          continue;
        const hash = file.slice(0, -5);
        if (!isHex(hash)) continue;
        const [receipt, tx] = await Promise.all([
          client.getTransactionReceipt({ hash }),
          client.getTransaction({ hash }),
        ]);
        if (
          receipt.status !== "reverted" ||
          tx.to?.toLowerCase() !== state.account.toLowerCase()
        )
          continue;
        const reason =
          "reason" in proof && typeof proof.reason === "string"
            ? proof.reason
            : "Reason unavailable";
        state.rejections.push({
          hash,
          reason,
          block: receipt.blockNumber.toString(),
        });
      } catch {
        /* A malformed or unavailable proof cannot become a rejection-history entry. */
      }
    }
    return publicResponse(state);
  } catch {
    return publicResponse({
      ...state,
      error:
        "Live state is unavailable. Check configuration and Monad Testnet RPC.",
    });
  }
}
