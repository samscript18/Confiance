"use client";
import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  encodeDeployData,
  encodeFunctionData,
  erc20Abi,
  http,
  isAddress,
  isHex,
  keccak256,
  stringToHex,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { monadTestnet } from "../../../packages/shared/chain";
import {
  confianceAbi,
  confianceBytecode,
  demoTokenAbi,
  demoTokenBytecode,
} from "../../../packages/shared/contracts";
import { identityCommitment } from "../../../packages/shared/identity";
import { validGithubRepo } from "../../../packages/shared/github";
import { parseExactAmount } from "../../../agent/tools/amount";
import { contractError } from "../../../packages/shared/errors";
import {
  connectOwner,
  disconnectOwner,
  ownerAccount,
  ownerError,
} from "../lib/mera";
import type { DashboardState } from "../lib/state";

const explorer = monadTestnet.blockExplorers.default.url;
const empty: DashboardState = {
  network: "Monad Testnet",
  chainId: 10143,
  configured: false,
  events: [],
  historySource: "unavailable",
  readiness: [],
  taskAmount: "30",
};
const short = (value?: string) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not connected";
async function api(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      result && typeof result === "object" && "error" in result
        ? String(result.error)
        : "Request unavailable.",
    );
  return result;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object")
    throw new Error("Invalid server response.");
  return value as Record<string, unknown>;
}
export default function Dashboard() {
  const [state, setState] = useState(empty);
  const [owner, setOwner] = useState<Address>();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hex>();
  const [account, setAccount] = useState<Address>();
  const [asset, setAsset] = useState("");
  const [recipient, setRecipient] = useState("");
  const [limit, setLimit] = useState("50");
  const [repo, setRepo] = useState("");
  const [pr, setPr] = useState("42");
  const [fund, setFund] = useState("100");
  const [agent, setAgent] = useState<Address>();
  const [commitment, setCommitment] = useState<Hex>();
  const [forwarder, setForwarder] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowOwner, setWorkflowOwner] = useState("");
  const [attackProof, setAttackProof] = useState<{
    hash: Hex;
    reason: string;
    block: string;
  }>();
  const [transcript, setTranscript] = useState<
    { kind: string; content: string; name?: string }[]
  >([]);
  const [tab, setTab] = useState<"overview" | "setup">("overview");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("State unavailable.");
      const data = (await response.json()) as DashboardState;
      setState(data);
    } catch {
      setError("Cannot retrieve current chain state.");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    return () => {
      clearInterval(timer);
      disconnectOwner();
    };
  }, [refresh]);
  useEffect(() => {
    if (state.account) setAccount(state.account);
    if (state.asset) setAsset(state.asset);
    if (state.recipient) setRecipient(state.recipient);
    if (state.agent) setAgent(state.agent);
    if (state.github) {
      setRepo(state.github.repo);
      setPr(String(state.github.pr));
    }
    if (state.identity && state.registry)
      setCommitment(
        identityCommitment(state.registry, BigInt(state.identity.id)),
      );
  }, [state]);
  async function act(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      const mapped = contractError(e);
      setError(
        mapped.code === "EXECUTION_UNAVAILABLE"
          ? ownerError(e)
          : mapped.message,
      );
    } finally {
      setBusy("");
    }
  }
  async function authenticate(create: boolean) {
    const address = await connectOwner(create);
    setOwner(address);
    if (!state.owner) {
      setNotice(
        `Owner created: ${address}. Add CONFIANCE_OWNER=${address} to the ignored .env and restart the app, then sign in.`,
      );
      return;
    }
    if (address.toLowerCase() !== state.owner.toLowerCase())
      throw new Error("This passkey is not the configured Confiance owner.");
    const challenge = object(await api("/api/auth?action=challenge"));
    if (
      typeof challenge.message !== "string" ||
      typeof challenge.id !== "string"
    )
      throw new Error("Invalid authentication challenge.");
    const signature = await ownerAccount().signMessage({
      message: challenge.message,
    });
    await api("/api/auth", { id: challenge.id, owner: address, signature });
    setNotice(
      "Owner authenticated. Agent payments use its separate Privy signer.",
    );
  }
  function clients() {
    const rpc =
      process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
    return {
      client: createPublicClient({ chain: monadTestnet, transport: http(rpc) }),
      wallet: createWalletClient({
        account: ownerAccount(),
        chain: monadTestnet,
        transport: http(rpc),
      }),
    };
  }
  async function send(to: Address | undefined, data: Hex) {
    const { client, wallet } = clients();
    if ((await client.getChainId()) !== 10143)
      throw new Error("Wrong network. Use Monad Testnet, chain ID 10143.");
    const gas = await client.estimateGas({
      account: wallet.account,
      ...(to ? { to } : {}),
      data,
    });
    const tx = await wallet.sendTransaction({
      ...(to ? { to } : {}),
      data,
      gas: (gas * 110n + 99n) / 100n,
    });
    setHash(tx);
    const receipt = await client.waitForTransactionReceipt({
      hash: tx,
      confirmations: 2,
    });
    if (receipt.status !== "success")
      throw new Error("Owner transaction reverted.");
    return receipt;
  }
  async function deploy() {
    const receipt = await send(
      undefined,
      encodeDeployData({
        abi: confianceAbi,
        bytecode: confianceBytecode,
        args: [ownerAccount().address],
      }),
    );
    if (!receipt.contractAddress)
      throw new Error("No deployed address in receipt.");
    setAccount(receipt.contractAddress);
    setNotice(
      `Deployed ${receipt.contractAddress}. Run npm run record:deployment -- ${receipt.transactionHash}, then set CONFIANCE_ADDRESS and CONFIANCE_DEPLOYMENT_BLOCK in .env and restart.`,
    );
  }
  async function provision() {
    const result = object(await api("/api/agent?action=wallet"));
    if (typeof result.address !== "string" || !isAddress(result.address))
      throw new Error("Invalid agent address.");
    setAgent(result.address);
    setNotice(
      "Privy agent wallet connected. Fund this address with testnet MON for gas.",
    );
  }
  async function identity() {
    const result = object(await api("/api/agent?action=identity"));
    if (typeof result.commitment !== "string" || !isHex(result.commitment))
      throw new Error("Identity proof missing.");
    setCommitment(result.commitment);
    setNotice(
      `ERC-8004 identity ${String(result.id)} registered by the agent. Its verified address is the wallet binding.`,
    );
  }
  async function authorize(update = false) {
    if (
      !account ||
      !agent ||
      !isAddress(asset) ||
      !isAddress(recipient) ||
      !commitment
    )
      throw new Error(
        "Create the account, agent wallet and verified ERC-8004 identity, then configure asset and recipient.",
      );
    if (!validGithubRepo(repo) || !/^\d+$/.test(pr) || Number(pr) <= 0)
      throw new Error("Configure a real GitHub repository and pull request.");
    const { client } = clients();
    const decimals = await client.readContract({
      address: asset,
      abi: erc20Abi,
      functionName: "decimals",
    });
    const stored = await client.readContract({
      address: account,
      abi: confianceAbi,
      functionName: "identities",
      args: [agent],
    });
    if (stored === zeroHash)
      await send(
        account,
        encodeFunctionData({
          abi: confianceAbi,
          functionName: "registerAgent",
          args: [agent, commitment],
        }),
      );
    else if (stored !== commitment)
      throw new Error(
        "Registered identity commitment differs from this identity.",
      );
    const block = await client.getBlock();
    const policy = {
      allowedAsset: asset,
      allowedRecipient: recipient,
      spendingLimit: parseExactAmount(limit, decimals),
      expiry: block.timestamp + 86400n,
      complianceAdapter: zeroAddress,
      requiredCondition: keccak256(stringToHex(`github:${repo}:${Number(pr)}`)),
    };
    await send(
      account,
      encodeFunctionData({
        abi: confianceAbi,
        functionName: update ? "updatePolicy" : "createSession",
        args: [agent, policy],
      }),
    );
    setNotice(
      "Owner-authorized policy confirmed: total session budget, 24 hours, pinned recipient and GitHub milestone. No Cleanverse compliance is claimed. Match PAYMENT_ASSET, PAYMENT_RECIPIENT and GITHUB_REPO/PR in .env.",
    );
  }
  async function funding() {
    if (!account || !isAddress(asset))
      throw new Error("Configure the account and token first.");
    const { client } = clients();
    const decimals = await client.readContract({
      address: asset,
      abi: erc20Abi,
      functionName: "decimals",
    });
    await send(
      asset,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [account, parseExactAmount(fund, decimals)],
      }),
    );
    setNotice("Treasury funding confirmed on Monad Testnet.");
  }
  async function testToken() {
    if (!account) throw new Error("Deploy Confiance first.");
    const receipt = await send(
      undefined,
      encodeDeployData({
        abi: demoTokenAbi,
        bytecode: demoTokenBytecode,
        args: [account],
      }),
    );
    if (!receipt.contractAddress)
      throw new Error("Token deployment not confirmed.");
    setAsset(receipt.contractAddress);
    setNotice(
      `CTT deployed and 1,000 test tokens minted to Confiance. Set PAYMENT_ASSET=${receipt.contractAddress}. CTT is a test token, not dollars or Cleanverse.`,
    );
  }
  async function run() {
    const result = object(await api("/api/agent?action=run"));
    if (!Array.isArray(result.transcript))
      throw new Error("No agent transcript returned.");
    const items = result.transcript.map((item: unknown) => {
      const row = object(item);
      if (typeof row.kind !== "string" || typeof row.content !== "string")
        throw new Error("Invalid transcript.");
      return {
        kind: row.kind,
        content: row.content,
        ...(typeof row.name === "string" ? { name: row.name } : {}),
      };
    });
    setTranscript(items);
    setNotice(
      "Agent run finished. Tool results below distinguish confirmed execution, blocked requests and pending submissions.",
    );
  }
  async function attack(mode: string) {
    const result = object(await api(`/api/agent?action=${mode}`));
    if (
      result.status !== "reverted" ||
      typeof result.hash !== "string" ||
      !isHex(result.hash) ||
      typeof result.reason !== "string" ||
      typeof result.block !== "string"
    )
      throw new Error("A rejected transaction was not verified.");
    setAttackProof({
      hash: result.hash,
      reason: result.reason,
      block: result.block,
    });
    setNotice(
      "The agent signed the request. Confiance reverted it on Monad Testnet.",
    );
  }
  async function configureReporter() {
    if (
      !account ||
      !isAddress(forwarder) ||
      !isAddress(workflowOwner) ||
      !isHex(workflowId) ||
      workflowId.length !== 66
    )
      throw new Error(
        "Use the authenticated CRE directory and deployed workflow metadata.",
      );
    await send(
      account,
      encodeFunctionData({
        abi: confianceAbi,
        functionName: "configureReporter",
        args: [{ forwarder, workflowId, workflowOwner }],
      }),
    );
    setNotice(
      "Authorized CRE reporter pinned onchain. Only matching reports can verify the milestone.",
    );
  }
  const session = state.session;
  const status = !session
    ? "Setup required"
    : !session.active
      ? "Revoked"
      : session.expired
        ? "Expired"
        : "Active";
  const expires = session
    ? Math.max(0, Number(session.expiry) - Math.floor(Date.now() / 1000))
    : 0;
  const disabled = Boolean(busy);
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">
          C<span>CONFIANCE</span>
        </a>
        <nav>
          <button
            className={tab === "overview" ? "selected" : ""}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            className={tab === "setup" ? "selected" : ""}
            onClick={() => setTab("setup")}
          >
            Account & policy
          </button>
        </nav>
        <span className="network">
          <i />
          Monad Testnet
        </span>
      </header>
      <div className="intro">
        <div>
          <p className="eyebrow">AUTHORITY, WITH BOUNDARIES</p>
          <h1>
            Give your agent a job.
            <br />
            <span>Keep control of your money.</span>
          </h1>
          <p className="subtle">
            You approve the policy once. Confiance enforces every payment.
          </p>
        </div>
        <div className="owner-pill">
          <span className="avatar">◎</span>
          <div>
            <small>Owner account</small>
            <strong title={owner || state.owner}>
              {short(owner || state.owner)}
            </strong>
          </div>
          {owner ? (
            <button
              disabled={disabled}
              onClick={() =>
                void act("Signing out", async () => {
                  disconnectOwner();
                  setOwner(undefined);
                  await api("/api/auth?action=logout");
                })
              }
            >
              Sign out
            </button>
          ) : (
            <button
              disabled={disabled}
              onClick={() => void act("Signing in", () => authenticate(false))}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
      {(notice || error || state.error) && (
        <div
          role={error || state.error ? "alert" : "status"}
          className={`notice ${error || state.error ? "error" : ""}`}
        >
          {error || state.error || notice}
        </div>
      )}
      {busy && (
        <p className="pending" role="status">
          {busy}… Waiting for the provider or confirmed chain result.
        </p>
      )}
      {hash && (
        <a
          className="tx-link"
          href={`${explorer}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View submitted owner transaction ↗ {short(hash)}
        </a>
      )}
      {tab === "overview" ? (
        <>
          <section className="dashboard-grid">
            <article className="agent-card">
              <div className="card-head">
                <span className="agent-icon">↗</span>
                <span
                  className={`status ${status === "Active" ? "active" : ""}`}
                >
                  <i />
                  {status}
                </span>
              </div>
              <p className="eyebrow">YOUR AUTONOMOUS WORKER</p>
              <h2>Payroll Agent</h2>
              <p className="subtle">
                Pay approved contractors when their milestone is verified.
              </p>
              <div className="identity-row">
                <span>Agent · Privy</span>
                <strong title={agent}>{short(agent)}</strong>
              </div>
              <div className="identity-row">
                <span>Owner · Mera</span>
                <strong title={state.owner}>{short(state.owner)}</strong>
              </div>
              <div className="identity-row">
                <span>ERC-8004 identity</span>
                <strong>
                  {state.identity ? `#${state.identity.id}` : "Not registered"}
                </strong>
              </div>
              <div className="task">
                <span className="task-dot" />
                <div>
                  <strong>
                    {session?.verified
                      ? "Milestone verified"
                      : state.github?.merged
                        ? "Waiting for CRE verification"
                        : "Waiting for milestone"}
                  </strong>
                  <p>
                    {state.github
                      ? `${state.github.repo} · PR #${state.github.pr} · ${state.github.merged ? "MERGED" : state.github.state.toUpperCase()}`
                      : "Configure the real GitHub milestone in setup."}
                  </p>
                </div>
              </div>
              <button
                className="primary full"
                disabled={disabled || !state.configured || !agent}
                onClick={() => void act("Running Payroll Agent", run)}
              >
                Run Payroll Agent <span>↗</span>
              </button>
              <small className="footnote">
                Uses the LLM and the agent’s Privy signer. No owner payment
                signature.
              </small>
            </article>
            <article className="authority-card">
              <div className="section-title">
                <p className="eyebrow">AUTHORIZED SPENDING</p>
                <span>Total session budget</span>
              </div>
              <div className="big-number">
                {session?.limit ?? "—"} <span>{state.symbol || "tokens"}</span>
              </div>
              <div className="budget-line">
                <span
                  style={{
                    width:
                      session && Number(session.limit) > 0
                        ? `${Math.min(100, (Number(session.spent) / Number(session.limit)) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="spending">
                <div>
                  <small>Spent</small>
                  <strong>{session?.spent ?? "—"}</strong>
                </div>
                <div>
                  <small>Remaining</small>
                  <strong>{session?.remaining ?? "—"}</strong>
                </div>
                <div>
                  <small>Expires in</small>
                  <strong>
                    {session
                      ? `${Math.floor(expires / 3600)}h ${Math.floor((expires % 3600) / 60)}m`
                      : "—"}
                  </strong>
                </div>
              </div>
              <div className="rules">
                <div>
                  <span>◇</span>
                  <p>Required milestone</p>
                  <strong>
                    {session?.verified
                      ? "Verified ✓"
                      : session
                        ? "Not verified"
                        : "Not configured"}
                  </strong>
                </div>
                <div>
                  <span>◈</span>
                  <p>Recipient</p>
                  <strong title={state.recipient}>
                    {short(state.recipient)}
                  </strong>
                </div>
                <div>
                  <span>◉</span>
                  <p>Compliance</p>
                  <strong>
                    {session?.adapter && session.adapter !== zeroAddress
                      ? "Configured adapter"
                      : "A-Pass unverified"}
                  </strong>
                </div>
                <div>
                  <span>□</span>
                  <p>Treasury balance</p>
                  <strong>
                    {state.balance ?? "—"} {state.symbol || ""}
                  </strong>
                </div>
              </div>
              <p className="footnote">
                Amounts are actual token units. Dollar value and Cleanverse
                compliance are not assumed.
              </p>
            </article>
          </section>
          <section className="lower-grid">
            <article className="panel">
              <div className="section-title">
                <h3>Activity</h3>
                <span>
                  {state.historySource === "Monad RPC"
                    ? "Recent onchain logs"
                    : state.historySource}
                </span>
              </div>
              {state.events.length ? (
                state.events.map((item) => (
                  <a
                    className="event"
                    key={item.id}
                    href={`${explorer}/tx/${item.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="event-icon">↗</span>
                    <div>
                      <strong>
                        {item.kind.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      </strong>
                      {item.kind === "PaymentExecuted" &&
                        item.amount &&
                        item.asset &&
                        state.asset &&
                        item.asset.toLowerCase() ===
                          state.asset.toLowerCase() &&
                        state.decimals !== undefined && (
                          <small>
                            {formatUnits(BigInt(item.amount), state.decimals)}{" "}
                            {state.symbol}
                          </small>
                        )}
                      <small>
                        Block {item.block} · {short(item.hash)}
                      </small>
                    </div>
                    <span>↗</span>
                  </a>
                ))
              ) : (
                <div className="empty">
                  <span>◇</span>
                  <p>No confirmed activity to display.</p>
                  <small>
                    History appears after deployment and real transactions.
                  </small>
                </div>
              )}
              {state.rejections?.map((item) => (
                <a
                  className="event"
                  key={item.hash}
                  href={`${explorer}/tx/${item.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="event-icon">×</span>
                  <div>
                    <strong>Payment reverted</strong>
                    <small>{item.reason} · pre-submission simulation</small>
                    <small>Verified receipt · block {item.block}</small>
                  </div>
                  <span>↗</span>
                </a>
              ))}
            </article>
            <article className="panel boundary">
              <p className="eyebrow">THE AUTHORITY BOUNDARY</p>
              <h3>
                The key still exists.
                <br />
                <span>The authority does not.</span>
              </h3>
              <p>
                Revoke the session. The same agent wallet can keep its key, but
                Confiance stops its next request.
              </p>
              <button
                className="danger"
                disabled={
                  disabled || !owner || !account || !agent || !session?.active
                }
                onClick={() =>
                  void act("Revoking session", async () => {
                    if (!account || !agent) throw new Error("No session.");
                    await send(
                      account,
                      encodeFunctionData({
                        abi: confianceAbi,
                        functionName: "revokeSession",
                        args: [agent],
                      }),
                    );
                    setNotice(
                      "Session revoked onchain. Run the agent again to see the same key lose its authority.",
                    );
                  })
                }
              >
                Revoke agent session
              </button>
              <p className="footnote">
                Over-limit and recipient attack receipts use the documented
                agent diagnostic command.
              </p>
            </article>
          </section>
          <section className="panel transcript">
            <div className="section-title">
              <h3>Test the boundaries</h3>
              <span>Deterministic security demo · agent signer</span>
            </div>
            <p className="footnote">
              These controls submit real rejected transactions using Privy. They
              are security diagnostics, separate from the LLM’s decisions. Each
              operation costs agent testnet gas.
            </p>
            <div className="button-row">
              <button
                disabled={disabled || !owner || !session}
                onClick={() =>
                  void act("Testing spending limit", () =>
                    attack("attack-limit"),
                  )
                }
              >
                Attempt 500 tokens
              </button>
              <button
                disabled={disabled || !owner || !session}
                onClick={() =>
                  void act("Testing milestone condition", () =>
                    attack("attack-condition"),
                  )
                }
              >
                Attempt before verification
              </button>
              <button
                disabled={disabled || !owner || !session}
                onClick={() =>
                  void act("Testing recipient rule", () =>
                    attack("attack-recipient"),
                  )
                }
              >
                Attempt wrong recipient
              </button>
              <button
                disabled={disabled || !owner || !session || session.active}
                onClick={() =>
                  void act("Retrying with revoked key", () =>
                    attack("attack-revoked"),
                  )
                }
              >
                Retry after revocation
              </button>
            </div>
            {attackProof && (
              <div className="notice">
                <strong>REVERTED · {attackProof.reason}</strong>
                <p>
                  Receipt confirms revert in block {attackProof.block}. Reason
                  comes from the pre-submission onchain simulation.
                </p>
                <a
                  href={`${explorer}/tx/${attackProof.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View real agent transaction ↗ {short(attackProof.hash)}
                </a>
              </div>
            )}
          </section>
          {transcript.length > 0 && (
            <section className="panel transcript">
              <h3>Latest agent run</h3>
              <p className="footnote">
                Reasoning is the model’s interpretation. Payment tool receipts
                are the execution proof.
              </p>
              {transcript.map((row, index) => (
                <div key={index}>
                  <span className="eyebrow">
                    {row.kind === "tool" ? row.name : "Agent reasoning"}
                  </span>
                  <pre>{row.content}</pre>
                  {row.kind === "tool" &&
                    (() => {
                      try {
                        const value: unknown = JSON.parse(row.content);
                        const data = object(value);
                        if (
                          typeof data.transactionHash === "string" &&
                          /^0x[0-9a-f]{64}$/i.test(data.transactionHash)
                        )
                          return (
                            <a
                              className="tx-link"
                              href={`${explorer}/tx/${data.transactionHash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View agent transaction ↗
                            </a>
                          );
                      } catch {
                        /* Text remains visible when no transaction proof exists. */
                      }
                      return null;
                    })()}
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="setup-grid">
          <article className="panel">
            <p className="eyebrow">01 · OWNER</p>
            <h2>Your account, your authority.</h2>
            <p>
              Create a Mera passkey on this domain, or sign in with your
              existing passkey. A PRF-capable authenticator is required.
            </p>
            <div className="button-row">
              <button
                className="primary"
                disabled={disabled}
                onClick={() =>
                  void act("Creating owner", () => authenticate(true))
                }
              >
                Create passkey
              </button>
              <button
                disabled={disabled}
                onClick={() =>
                  void act("Signing in", () => authenticate(false))
                }
              >
                Sign in
              </button>
            </div>
            <p className="footnote">
              Owner: <code>{owner || state.owner || "Not connected"}</code>
            </p>
            <p className="footnote">
              Fund the owner with testnet MON before deploying. Keep the same
              domain: passkeys are scoped to it.
            </p>
            <button
              disabled={disabled || !owner || Boolean(state.account)}
              onClick={() => void act("Deploying Confiance", deploy)}
            >
              Deploy Confiance
            </button>
            <p className="footnote">
              Account: <code>{account || "Not deployed"}</code>
            </p>
            <button
              disabled={disabled || !owner || !account}
              onClick={() => void act("Deploying test token", testToken)}
            >
              Deploy & fund CTT test token
            </button>
            <p className="footnote">
              Test-token path has no A-Pass enforcement. Cleanverse is blocked
              pending confirmed contract enrollment and ABI.
            </p>
          </article>
          <article className="panel">
            <p className="eyebrow">02 · AGENT</p>
            <h2>A separate signer.</h2>
            <p>
              Privy provides the agent wallet. Confiance determines what that
              wallet is allowed to spend.
            </p>
            <button
              className="primary"
              disabled={disabled || !owner}
              onClick={() => void act("Connecting Privy wallet", provision)}
            >
              Create / connect Privy wallet
            </button>
            <p className="footnote">
              Agent: <code>{agent || "Not connected"}</code>
            </p>
            <p className="footnote">
              Gas balance: {state.agentGas ?? "Unavailable"} MON. Fund the agent
              with testnet MON before registration or payments.
            </p>
            <button
              disabled={disabled || !owner || !agent}
              onClick={() =>
                void act("Registering ERC-8004 identity", identity)
              }
            >
              Register ERC-8004 identity
            </button>
            <p className="footnote">
              Requires the configured live registry and a public agent
              registration document URI. The agent signs its own registration.
            </p>
          </article>
          <article className="panel policy-form">
            <p className="eyebrow">03 · POLICY</p>
            <h2>Set the boundaries.</h2>
            <label>
              Allowed token address
              <input
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="0x…"
              />
            </label>
            <label>
              Approved recipient
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x…"
              />
            </label>
            <div className="form-pair">
              <label>
                Total budget · token units
                <input
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label>
                Session duration
                <input value="24 hours" readOnly />
              </label>
            </div>
            <div className="form-pair">
              <label>
                GitHub repository
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/repository"
                />
              </label>
              <label>
                Pull request
                <input
                  value={pr}
                  onChange={(e) => setPr(e.target.value)}
                  inputMode="numeric"
                />
              </label>
            </div>
            <p className="footnote">
              Milestone writes are restricted to the configured CRE reporter.
              This form cannot verify a milestone. Recipient restriction is an
              exact owner-pinned address.
            </p>
            <div className="button-row">
              <button
                className="primary"
                disabled={disabled || !owner || !commitment}
                onClick={() =>
                  void act("Authorizing session", () => authorize())
                }
              >
                Authorize session
              </button>
              <button
                disabled={disabled || !owner || !session?.active}
                onClick={() =>
                  void act("Updating policy", () => authorize(true))
                }
              >
                Update policy
              </button>
            </div>
            <label>
              Fund treasury · token units
              <input
                value={fund}
                onChange={(e) => setFund(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <button
              disabled={disabled || !owner || !account}
              onClick={() => void act("Funding treasury", funding)}
            >
              Transfer tokens to Confiance
            </button>
          </article>
          <article className="panel policy-form">
            <p className="eyebrow">04 · CONNECTIONS</p>
            <h2>Integration configuration</h2>
            {state.readiness.map((item) => (
              <div className="connection" key={item.name}>
                <span className={item.ready ? "ready-dot" : "missing-dot"} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.detail}</p>
                </div>
                <small>{item.ready ? "Configured" : "Required"}</small>
              </div>
            ))}
            <label>
              Authorized CRE forwarder
              <input
                value={forwarder}
                onChange={(e) => setForwarder(e.target.value)}
                placeholder="Confirmed Monad testnet forwarder"
              />
            </label>
            <label>
              Deployed workflow ID
              <input
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                placeholder="0x… (32 bytes)"
              />
            </label>
            <label>
              Workflow owner
              <input
                value={workflowOwner}
                onChange={(e) => setWorkflowOwner(e.target.value)}
                placeholder="0x…"
              />
            </label>
            <button
              disabled={disabled || !owner || !account}
              onClick={() =>
                void act("Authorizing CRE reporter", configureReporter)
              }
            >
              Authorize CRE reporter
            </button>
            <p className="footnote">
              Configuration does not prove a live integration. See docs/SETUP.md
              for credentials, CRE reporter configuration and the complete
              transaction proof procedure.
            </p>
          </article>
        </section>
      )}
      <footer>
        <span>CONFIANCE</span>
        <p>Intelligence requests. Authority validates. Monad settles.</p>
        <a
          href="https://testnet.monadexplorer.com"
          target="_blank"
          rel="noreferrer"
        >
          Monad Testnet ↗
        </a>
      </footer>
    </main>
  );
}
