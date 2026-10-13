"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPages, isAppSection } from "../lib/navigation";
import CleanverseRegistration from "./cleanverse-registration";
import AgentRun from "./agent-run";
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
import { parseReporterSettings } from "../../../packages/shared/reporter";
import { parseExactAmount } from "../../../agent/tools/amount";
import { contractError, messages } from "../../../packages/shared/errors";
import {
  connectOwner,
  disconnectOwner,
  ownerAccount,
  ownerError,
  hasOwnerCredential,
  ownerSessionActive,
  subscribeOwnerSession,
} from "../lib/mera";
import { sessionActions } from "../lib/action-state";
import type { DashboardState } from "../lib/state";
import { MessageModal } from "./message-modal";
import { ActionButton } from "./action-button";
import {
  actionCopy,
  blockedPayment,
  payrollFeedback,
  type Feedback,
} from "../lib/feedback";
import { ConfianceLogo } from "./logo";

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
      "We couldn’t complete this request. Check that you’re signed in and connected, then try again. If a payment is still pending, wait for its result first.",
    );
  return result;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object")
    throw new Error("Invalid server response.");
  return value as Record<string, unknown>;
}
export default function Dashboard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[2] || "overview";
  const section = isAppSection(segment) ? segment : "overview";
  useEffect(() => {
    const revealTests = () => {
      if (location.hash !== "#test-permissions") return;
      const element = document.getElementById("test-permissions");
      if (element instanceof HTMLDetailsElement) element.open = true;
    };
    revealTests();
    window.addEventListener("hashchange", revealTests);
    return () => window.removeEventListener("hashchange", revealTests);
  }, [section]);
  const [state, setState] = useState(empty);
  const [navigationOpen, setNavigationOpen] = useState(false);
  useEffect(() => setNavigationOpen(false), [pathname]);
  const [owner, setOwner] = useState<Address>();
  const [hasPasskey, setHasPasskey] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Feedback>();
  const [errorTitle, setErrorTitle] = useState("Connection needs attention");
  const [error, setError] = useState("");
  const [dismissedStateError, setDismissedStateError] = useState("");
  const [hash, setHash] = useState<Hex>();
  const [account, setAccount] = useState<Address>();
  const [asset, setAsset] = useState("");
  const [createdToken, setCreatedToken] = useState<Address>();
  const [recipient, setRecipient] = useState("");
  const [limit, setLimit] = useState("50");
  const [paymentAmount, setPaymentAmount] = useState("30");
  const [amountEdited, setAmountEdited] = useState(false);
  const [taskPolicyHash, setTaskPolicyHash] = useState<Hex>();
  const [repo, setRepo] = useState("");
  const [pr, setPr] = useState("");
  const [fund, setFund] = useState("100");
  const [agent, setAgent] = useState<Address>();
  const [commitment, setCommitment] = useState<Hex>();
  const [forwarder, setForwarder] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [workflowOwner, setWorkflowOwner] = useState("");
  const [reporterEdited, setReporterEdited] = useState(false);
  const [attackProof, setAttackProof] = useState<{
    hash: Hex;
    reason: string;
    block: string;
  }>();
  const [transcript, setTranscript] = useState<
    { kind: string; content: string; name?: string }[]
  >([]);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("State unavailable.");
      const data = (await response.json()) as DashboardState;
      setState(data);
    } catch {
      setErrorTitle("Your account couldn’t refresh");
      setError(
        "We couldn’t load the latest account information. Check your connection and try again.",
      );
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
    try {
      setHasPasskey(hasOwnerCredential());
    } catch {
      setHasPasskey(true);
    }
    return subscribeOwnerSession(() => {
      if (!ownerSessionActive()) {
        setOwner(undefined);
        setState(empty);
        setHash(undefined);
        setTranscript([]);
        void api("/api/auth?action=logout").catch(() => {
          // The UI stays locked even when a disconnected server cannot clear its cookie.
          setErrorTitle("Your signing session ended");
          setError("Sign in again to open your workspace.");
        });
      }
    });
  }, []);
  useEffect(() => {
    if (state.account) setAccount(state.account);
    if (state.workerTranscript?.length && !busy)
      setTranscript(state.workerTranscript);
    if (!amountEdited) setPaymentAmount(state.taskAmount);
    if (state.taskAsset || state.asset)
      setAsset((current) => current || state.taskAsset || state.asset || "");
    if (state.recipient)
      setRecipient((current) => current || state.recipient || "");
    if (state.agent) setAgent(state.agent);
    const github = state.taskMilestone || state.github;
    if (github) {
      setRepo((current) => current || github.repo);
      setPr((current) => current || String(github.pr));
    }
    if (state.identity && state.registry)
      setCommitment(
        identityCommitment(state.registry, BigInt(state.identity.id)),
      );
  }, [state, amountEdited, busy]);
  useEffect(() => {
    const setup = state.reporterSetup;
    if (setup && !reporterEdited) {
      setForwarder(setup.forwarder);
      setWorkflowId(setup.workflowId);
      setWorkflowOwner(setup.workflowOwner);
    }
  }, [state.reporterSetup, reporterEdited]);
  async function act(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice(undefined);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setErrorTitle(actionCopy(label).errorTitle);
      if (label === "Signing in" || label === "Creating owner") {
        disconnectOwner();
        setOwner(undefined);
      }
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
  const remoteOwnerConsole =
    state.ownerConsoleUrl &&
    typeof window !== "undefined" &&
    new URL(state.ownerConsoleUrl).origin !== window.location.origin;
  async function authenticate(create: boolean) {
    const address = await connectOwner(create);
    setHasPasskey(true);
    if (!state.owner) {
      // Obtain the owner binding from the signed challenge; private workspace
      // state is deliberately unavailable before server authentication.
      const challenge = object(await api("/api/auth?action=challenge"));
      if (
        typeof challenge.message !== "string" ||
        typeof challenge.id !== "string"
      )
        throw new Error("Sign-in unavailable.");
      const signature = await ownerAccount().signMessage({
        message: challenge.message,
      });
      await api("/api/auth", { id: challenge.id, owner: address, signature });
      setOwner(address);
      setNotice({
        title: "Welcome back",
        message: "You’re signed in. Your workspace is ready.",
      });
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
    setOwner(address);
    setNotice({
      title: "Welcome back",
      message:
        "You’re signed in. You can now manage your account and Payroll Agent’s permissions.",
    });
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
    setNotice({
      title: "Your Confiance account is created",
      message:
        "Your account has been created on Monad Testnet. Its address is shown below.",
      nextStep:
        "Finish connecting it to this app, then add funds and set up Payroll Agent.",
      transactionHash: receipt.transactionHash,
    });
  }
  async function provision() {
    const result = object(await api("/api/agent?action=wallet"));
    if (typeof result.address !== "string" || !isAddress(result.address))
      throw new Error("Invalid agent address.");
    setAgent(result.address);
    setNotice({
      title: "The agent’s wallet is ready",
      message: "Payroll Agent now has its own wallet, separate from yours.",
      nextStep:
        "Add testnet MON to the agent wallet for transaction fees, then register its identity.",
    });
  }
  async function identity() {
    const result = object(await api("/api/agent?action=identity"));
    if (typeof result.commitment !== "string" || !isHex(result.commitment))
      throw new Error("Identity proof missing.");
    setCommitment(result.commitment);
    setNotice({
      title: "Payroll Agent is registered",
      message:
        "The agent’s identity is recorded on Monad Testnet and linked to its wallet.",
      nextStep:
        "Choose who it can pay, how much it can spend, and the milestone it must wait for.",
    });
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
    const [currentSession, currentBlock] = await Promise.all([
      client.readContract({
        address: account,
        abi: confianceAbi,
        functionName: "getSession",
        args: [agent],
      }),
      client.getBlock(),
    ]);
    if (
      !update &&
      currentSession.active &&
      currentSession.policy.expiry > currentBlock.timestamp
    )
      throw new Error(messages.SESSION_ALREADY_ACTIVE);
    if (update && (!currentSession.exists || !currentSession.active))
      throw new Error(
        "There is no active session to update. Create a new session instead.",
      );
    if (
      update &&
      currentSession.policy.allowedAsset.toLowerCase() !== asset.toLowerCase()
    )
      throw new Error(
        "An existing session cannot change tokens. Revoke the session, then authorize a new one with the funded token.",
      );
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
    const approvedReceipt = await send(
      account,
      encodeFunctionData({
        abi: confianceAbi,
        functionName: update ? "updatePolicy" : "createSession",
        args: [agent, policy],
      }),
    );
    setTaskPolicyHash(approvedReceipt.transactionHash);
    await saveTask(approvedReceipt.transactionHash);
    setNotice(
      update
        ? {
            title: "Your spending rules are updated",
            message: `Payroll Agent can spend up to ${limit} token units in total. Previous spending still counts, and permission lasts another 24 hours.`,
            nextStep: "Review the updated rules in Overview.",
          }
        : {
            title: "Payroll Agent is authorized",
            message: `You’ve given Payroll Agent a total allowance of ${limit} token units for 24 hours. It can pay your approved contractor once the required milestone is verified.`,
            nextStep: "Review its allowance and milestone status in Overview.",
          },
    );
  }
  const indexedPolicyHash = state.events.find(
    (event) =>
      ["SessionCreated", "PolicyUpdated"].includes(event.kind) &&
      (!event.agent || event.agent.toLowerCase() === agent?.toLowerCase()),
  )?.hash;
  const approvedPolicyHash =
    taskPolicyHash ||
    (indexedPolicyHash && isHex(indexedPolicyHash)
      ? indexedPolicyHash
      : undefined);
  async function saveTask(receiptHash = approvedPolicyHash) {
    if (!receiptHash) throw new Error("Approve the task policy first.");
    await api("/api/task", {
      action: "save",
      repo,
      pr: Number(pr),
      asset,
      recipient,
      amount: paymentAmount,
      policyHash: receiptHash,
    });
    setNotice({
      title: "Payroll task saved",
      message:
        "Your task is stored with its confirmed owner-approved rules. Start monitoring when you want the agent to observe this milestone.",
    });
  }
  async function monitoring(enabled: boolean) {
    await api("/api/task", { action: "monitor", enabled });
    setNotice({
      title: enabled ? "Monitoring enabled" : "Monitoring paused",
      message: enabled
        ? "The hosted worker will inspect this task independently. Payment still requires the verified milestone and your onchain permission."
        : "Future observation cycles are paused. A payment already submitted can still confirm; revoke the session to remove spending authority.",
    });
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
    const amount = parseExactAmount(fund, decimals);
    const ownerBalance = await client.readContract({
      address: asset,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [ownerAccount().address],
    });
    if (ownerBalance < amount)
      throw new Error(
        `Your owner wallet holds ${formatUnits(ownerBalance, decimals)} units of this token. Funding transfers tokens from the owner wallet, not from Confiance's existing balance.`,
      );
    await send(
      asset,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [account, amount],
      }),
    );
    setNotice({
      title: "Funds added",
      message: `${fund} token units have been added to your Confiance account. Payroll Agent can use them within the rules you approved.`,
    });
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
    setCreatedToken(receipt.contractAddress);
    setNotice({
      title: "Your test funds are ready",
      message:
        "1,000 CTT test tokens have been added to Confiance. You can use them to demonstrate the payment flow.",
      nextStep:
        "Connect this token to your payment setup, then authorize the agent’s spending rules.",
      transactionHash: receipt.transactionHash,
    });
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
    setNotice(payrollFeedback(items));
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
    setNotice(blockedPayment(result.reason, result.hash));
  }
  async function configureReporter() {
    if (!account)
      throw new Error(
        "Deploy or connect Confiance before authorizing its reporter.",
      );
    const reporter = parseReporterSettings({
      forwarder,
      workflowId,
      workflowOwner,
    });
    await send(
      account,
      encodeFunctionData({
        abi: confianceAbi,
        functionName: "configureReporter",
        args: [reporter],
      }),
    );
    setNotice({
      title: "Milestone verification is enabled",
      message:
        "You’ve approved the service that checks the contractor’s milestone. The agent can pay only after that check confirms completion.",
      nextStep:
        "Complete the GitHub milestone, then wait for its status to show Verified.",
    });
  }
  const session = state.session;
  const milestoneMismatch = Boolean(
    session &&
      state.taskMilestone &&
      session.condition !== state.taskMilestone.condition,
  );
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
  let policyReady = Boolean(
    commitment &&
      isAddress(asset) &&
      asset !== zeroAddress &&
      isAddress(recipient) &&
      recipient !== zeroAddress &&
      /^\d+(\.\d+)?$/.test(limit) &&
      /[1-9]/.test(limit) &&
      validGithubRepo(repo) &&
      /^\d+$/.test(pr) &&
      Number(pr) > 0,
  );
  let policyChanged = true;
  if (
    session &&
    policyReady &&
    state.decimals !== undefined &&
    asset.toLowerCase() === state.asset?.toLowerCase()
  ) {
    try {
      policyChanged =
        asset.toLowerCase() !== state.asset?.toLowerCase() ||
        recipient.toLowerCase() !== state.recipient?.toLowerCase() ||
        parseExactAmount(limit, state.decimals) !==
          parseExactAmount(session.limit, state.decimals) ||
        keccak256(stringToHex(`github:${repo}:${Number(pr)}`)) !==
          session.condition;
    } catch {
      policyReady = false;
    }
  }
  const actions = sessionActions(
    state,
    Boolean(owner),
    policyReady,
    asset,
    policyChanged,
  );
  const identityRegistered = Boolean(
    state.identity &&
      state.agent &&
      state.identity.wallet.toLowerCase() === state.agent.toLowerCase() &&
      state.identity.owner.toLowerCase() === state.agent.toLowerCase(),
  );
  let reporterValid = false;
  let reporterMatches = false;
  try {
    const selected = parseReporterSettings({
      forwarder,
      workflowId,
      workflowOwner,
    });
    reporterValid = true;
    reporterMatches = Boolean(
      state.reporter &&
        selected.forwarder.toLowerCase() ===
          state.reporter.forwarder.toLowerCase() &&
        selected.workflowId.toLowerCase() ===
          state.reporter.workflowId.toLowerCase() &&
        selected.workflowOwner.toLowerCase() ===
          state.reporter.workflowOwner.toLowerCase(),
    );
  } catch {
    /* Incomplete reporter fields cannot enable a signing action. */
  }
  const reporterExists = Boolean(
    state.reporter && state.reporter.forwarder !== zeroAddress,
  );
  const sessionAssetLocked = Boolean(session?.active);
  const testFundsCreated = Boolean(createdToken);
  const diagnosticHints = [
    ...new Set(
      [
        actions.limit.reason,
        actions.condition.reason,
        actions.recipient.reason,
        actions.revoked.reason,
      ].filter(Boolean),
    ),
  ];
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="brand" href="/" aria-label="Confiance home">
          <ConfianceLogo size={32} />
        </Link>
        <button
          className="mobile-navigation-toggle"
          aria-label={navigationOpen ? "Close menu" : "Menu"}
          aria-expanded={navigationOpen}
          aria-controls="workspace-navigation"
          onClick={() => setNavigationOpen((open) => !open)}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {navigationOpen ? (
              <path d="m6 6 12 12M6 18 18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <p className="sidebar-eyebrow">YOUR WORKSPACE</p>
        <nav
          id="workspace-navigation"
          className={navigationOpen ? "is-open" : ""}
          aria-label="App navigation"
        >
          {Object.entries(appPages).map(([key, page], index) => (
            <Link
              key={key}
              href={`/app/${key}`}
              className={section === key ? "selected" : ""}
              aria-current={section === key ? "page" : undefined}
            >
              <span className="sidebar-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {key === "account"
                ? "Account"
                : key === "agent"
                  ? "Agent"
                  : page.title}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="network">
            <i />
            Monad Testnet
          </span>
          <p>Your rules are enforced by Confiance onchain.</p>
          <Link href="/#how-it-works">How Confiance works ↗</Link>
        </div>
      </aside>
      <main className={`app-main app-page-${section}`}>
        <header className="app-topbar">
          <span>Workspace / {appPages[section].title}</span>
          <Link href="/">Back to website ↗</Link>
        </header>
        <div className="intro">
          <div>
            <p className="eyebrow">AUTHORITY, WITH BOUNDARIES</p>
            <h1>{appPages[section].title}</h1>
            <p className="subtle">
              Give an AI agent a job without giving it your wallet.
            </p>
          </div>
          <div className="owner-pill">
            <span className="avatar">◎</span>
            <div>
              <small>
                {owner ? "Owner signed in" : "Your workspace is locked"}
              </small>
              <strong title={owner}>
                {owner ? short(owner) : "Sign in to continue"}
              </strong>
            </div>
            {owner ? (
              <ActionButton
                pending={busy === "Signing out"}
                pendingLabel={actionCopy("Signing out").pending}
                disabled={disabled}
                onClick={() =>
                  void act("Signing out", async () => {
                    disconnectOwner();
                    setOwner(undefined);
                    await api("/api/auth?action=logout");
                    setState(empty);
                    setHash(undefined);
                    setTranscript([]);
                    setNotice({
                      title: "You’re signed out",
                      message:
                        "Your owner signing session has ended. Sign in again whenever you need to manage the account.",
                    });
                  })
                }
              >
                Sign out
              </ActionButton>
            ) : remoteOwnerConsole ? (
              <a className="action-button" href="/owner-setup">
                Set up live owner
              </a>
            ) : (
              <ActionButton
                pending={busy === "Signing in"}
                pendingLabel={actionCopy("Signing in").pending}
                disabled={disabled}
                onClick={() =>
                  void act("Signing in", () => authenticate(false))
                }
              >
                Sign in
              </ActionButton>
            )}
          </div>
        </div>
        {(error ||
          (state.error !== dismissedStateError && state.error) ||
          notice) && (
          <MessageModal
            title={
              error
                ? errorTitle
                : state.error !== dismissedStateError && state.error
                  ? "Connection needs attention"
                  : notice?.title || ""
            }
            message={
              error ||
              (state.error !== dismissedStateError && state.error
                ? "We couldn’t refresh your account. Check your connection and try again."
                : "") ||
              notice?.message ||
              ""
            }
            tone={
              error || (state.error !== dismissedStateError && state.error)
                ? "error"
                : notice?.tone || "success"
            }
            {...(!error && !state.error && notice?.nextStep
              ? { nextStep: notice.nextStep }
              : {})}
            {...(!error && !state.error && notice?.transactionHash
              ? { transactionHash: notice.transactionHash }
              : {})}
            onDismiss={() => {
              setNotice(undefined);
              setError("");
              setDismissedStateError(state.error || "");
            }}
          />
        )}
        {busy && (
          <p className="pending" role="status">
            {actionCopy(busy).pending} Please keep this page open.
          </p>
        )}
        {owner && hash && (
          <a
            className="tx-link"
            href={`${explorer}/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View submitted owner transaction ↗ {short(hash)}
          </a>
        )}
        {!owner || !state.authenticated ? (
          <section className="workspace-locked panel">
            <span className="locked-symbol" aria-hidden="true">
              ◎
            </span>
            <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
            <h2>Sign in to your Confiance account</h2>
            <p>
              Your agent, spending rules, balances and payment history appear
              after you sign in with your owner passkey.
            </p>
            {remoteOwnerConsole ? (
              <a className="action-button primary" href="/owner-setup">
                Set up live owner ↗
              </a>
            ) : (
              <ActionButton
                className="primary"
                pending={busy === "Signing in"}
                pendingLabel="Opening your passkey…"
                disabled={disabled}
                onClick={() =>
                  void act("Signing in", () => authenticate(false))
                }
              >
                Sign in with passkey
              </ActionButton>
            )}
            <p className="footnote">
              Signing in opens your workspace. It does not authorize a payment.
            </p>
          </section>
        ) : (
          <>
            {children}
            <>
              {(section === "overview" || section === "agent") && (
                <section className="dashboard-grid">
                  {(section === "overview" || section === "agent") && (
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
                        Pay approved contractors when their milestone is
                        verified.
                      </p>
                      <div className="identity-row">
                        <span>Agent · Privy</span>
                        <strong title={agent}>{short(agent)}</strong>
                      </div>
                      <div className="identity-row">
                        <span>Owner · Mera</span>
                        <strong title={state.owner}>
                          {short(state.owner)}
                        </strong>
                      </div>
                      <div className="identity-row">
                        <span>ERC-8004 identity</span>
                        <strong>
                          {state.identity
                            ? `#${state.identity.id}`
                            : "Not registered"}
                        </strong>
                      </div>
                      <div className="task">
                        <span className="task-dot" />
                        <div>
                          <strong>
                            {milestoneMismatch
                              ? "Policy update needed"
                              : session?.verified
                                ? "Milestone verified"
                                : state.github?.merged
                                  ? "Waiting for CRE verification"
                                  : "Waiting for milestone"}
                          </strong>
                          <p>
                            {state.github
                              ? `${state.github.repo} · PR #${state.github.pr} · ${state.github.merged ? "MERGED" : state.github.state.toUpperCase()}`
                              : state.taskMilestone
                                ? `${state.taskMilestone.repo} · PR #${state.taskMilestone.pr} · Live GitHub status unavailable`
                                : "Configure the real GitHub milestone in setup."}
                          </p>
                        </div>
                      </div>
                      <ActionButton
                        pending={busy === "Running Payroll Agent"}
                        pendingLabel={
                          actionCopy("Running Payroll Agent").pending
                        }
                        className="primary full"
                        disabled={disabled || !actions.run.enabled}
                        onClick={() => void act("Running Payroll Agent", run)}
                      >
                        Run Payroll Agent <span>↗</span>
                      </ActionButton>
                      {section === "agent" && (
                        <div className="monitoring-panel">
                          <p className="eyebrow">AUTONOMOUS MONITORING</p>
                          <p>
                            {state.monitoring?.enabled
                              ? "Monitoring is enabled"
                              : "Monitoring is paused"}
                          </p>
                          <p className="footnote">
                            {state.worker &&
                            Date.now() - Date.parse(state.worker.heartbeat) <
                              300000
                              ? `Worker: ${state.worker.status.replaceAll("_", " ")}`
                              : "No recent worker heartbeat. The backend worker must be running before autonomous observation is available."}
                          </p>
                          <ActionButton
                            pending={busy === "Changing monitoring"}
                            pendingLabel="Updating monitoring…"
                            disabled={
                              disabled ||
                              !owner ||
                              !state.savedTask ||
                              (!state.monitoring?.enabled &&
                                !actions.run.enabled)
                            }
                            onClick={() =>
                              void act("Changing monitoring", () =>
                                monitoring(!state.monitoring?.enabled),
                              )
                            }
                          >
                            {state.monitoring?.enabled
                              ? "Pause monitoring"
                              : "Start monitoring"}
                          </ActionButton>
                        </div>
                      )}
                      <small className="footnote">
                        {actions.run.reason ||
                          "Runs the LLM with the agent’s Privy signer. It checks the milestone and policy before requesting payment; no owner payment signature."}
                      </small>
                    </article>
                  )}
                  {(section === "overview" || section === "agent") && (
                    <article className="authority-card">
                      <div className="section-title">
                        <p className="eyebrow">AUTHORIZED SPENDING</p>
                        <span>Total session budget</span>
                      </div>
                      <div className="big-number">
                        {session?.limit ?? "—"}{" "}
                        <span>{state.symbol || "tokens"}</span>
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
                        Amounts are actual token units. Dollar value and
                        Cleanverse compliance are not assumed.
                      </p>
                    </article>
                  )}
                </section>
              )}
              {section === "overview" && (
                <section className="panel milestone-page" id="milestone">
                  <p className="eyebrow">WORK BEFORE PAYMENT</p>
                  <h2>
                    {state.taskMilestone?.verified
                      ? "Milestone verified"
                      : "Waiting for verification"}
                  </h2>
                  {milestoneMismatch && (
                    <p className="setup-status">
                      Your session refers to a different milestone. Open Agent →
                      Permissions, use the configured payroll milestone, and
                      save the rules before the agent can pay.
                    </p>
                  )}
                  <p className="subtle">
                    {session?.verified
                      ? "The milestone is verified onchain. Payment still requires an active session and enough remaining allowance."
                      : "Merging the pull request is the first step. Confiance must receive verification from the authorized reporting service before the agent can pay."}
                  </p>
                  <div className="milestone-facts">
                    <div>
                      <small>GitHub milestone</small>
                      <strong>
                        {state.github
                          ? `PR #${state.github.pr} · ${state.github.merged ? "Merged" : state.github.state}`
                          : repo && pr
                            ? `${repo} · PR #${pr}`
                            : "Not configured"}
                      </strong>
                    </div>
                    <div>
                      <small>Payment condition</small>
                      <strong>
                        {milestoneMismatch
                          ? "Policy update needed"
                          : session?.verified
                            ? "Verified onchain ✓"
                            : session
                              ? "Not verified"
                              : "Authorize a session first"}
                      </strong>
                    </div>
                    <div>
                      <small>Configured milestone verification</small>
                      <strong>
                        {state.taskMilestone?.verified
                          ? "Verified onchain ✓"
                          : "Waiting for report"}
                      </strong>
                    </div>
                  </div>
                  <div className="button-row">
                    {repo && pr && (
                      <a
                        className="landing-button light"
                        href={`https://github.com/${repo}/pull/${pr}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View pull request ↗
                      </a>
                    )}
                    <Link className="landing-button light" href="/app/settings">
                      Check verification service ↗
                    </Link>
                    <Link className="landing-button dark" href="/app/agent">
                      Open Payroll Agent ↗
                    </Link>
                  </div>
                </section>
              )}
              {section === "activity" && (
                <section className="lower-grid">
                  {section === "activity" && (
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
                                    {formatUnits(
                                      BigInt(item.amount),
                                      state.decimals,
                                    )}{" "}
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
                            History appears after deployment and real
                            transactions.
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
                            <small>{blockedPayment(item.reason).message}</small>
                            <small>Verified receipt · block {item.block}</small>
                          </div>
                          <span>↗</span>
                        </a>
                      ))}
                    </article>
                  )}
                </section>
              )}
              {section === "agent" && transcript.length > 0 && (
                <AgentRun
                  rows={transcript}
                  symbol={state.symbol}
                  asset={state.asset}
                />
              )}
              {["account", "agent", "settings"].includes(section) && (
                <section
                  className={`setup-grid ${section === "agent" ? "agent-settings-grid" : ""}`}
                >
                  {section === "account" && (
                    <>
                      <article className="panel">
                        <p className="eyebrow">01 · OWNER</p>
                        <h2>Your account, your authority.</h2>
                        <p>
                          {remoteOwnerConsole
                            ? "Create your owner passkey on this website to manage the hosted account. Your previous account and proofs stay preserved."
                            : owner
                              ? "You are signed in with your owner passkey. You can manage the account and the agent’s authority."
                              : hasPasskey || state.account
                                ? "Sign in with your existing owner passkey. Signing sessions last ten minutes; your account and policy stay onchain after sign-out."
                                : "Create a Mera passkey on this domain, or sign in with an existing passkey. A PRF-capable authenticator is required."}
                        </p>
                        {remoteOwnerConsole ? (
                          <a
                            className="action-button primary"
                            href="/owner-setup"
                          >
                            Set up live owner
                          </a>
                        ) : owner ? (
                          <p className="setup-status">✓ Owner signed in</p>
                        ) : (
                          <div className="button-row">
                            {!hasPasskey && !state.account && (
                              <ActionButton
                                pending={busy === "Creating owner"}
                                pendingLabel={
                                  actionCopy("Creating owner").pending
                                }
                                className="primary"
                                disabled={disabled}
                                onClick={() =>
                                  void act("Creating owner", () =>
                                    authenticate(true),
                                  )
                                }
                              >
                                Create passkey
                              </ActionButton>
                            )}
                            <ActionButton
                              pending={busy === "Signing in"}
                              pendingLabel={actionCopy("Signing in").pending}
                              disabled={disabled}
                              onClick={() =>
                                void act("Signing in", () =>
                                  authenticate(false),
                                )
                              }
                            >
                              Sign in
                            </ActionButton>
                          </div>
                        )}
                        <p className="footnote">
                          Owner:{" "}
                          <code>{owner || state.owner || "Not connected"}</code>
                        </p>
                      </article>
                      <article className="panel account-deployment">
                        <p className="eyebrow">02 · SMART ACCOUNT</p>
                        <h2>Your Confiance account</h2>
                        <p className="footnote">
                          {state.account
                            ? "Your Confiance account is deployed on Monad Testnet."
                            : "Fund the owner with testnet MON before deploying. Sign in to approve deployment."}{" "}
                          Keep the same domain: passkeys are scoped to it.
                        </p>
                        <ActionButton
                          pending={busy === "Deploying Confiance"}
                          pendingLabel={
                            actionCopy("Deploying Confiance").pending
                          }
                          disabled={
                            disabled ||
                            !owner ||
                            Boolean(account) ||
                            Boolean(state.error)
                          }
                          onClick={() =>
                            void act("Deploying Confiance", deploy)
                          }
                        >
                          {account ? "Account deployed" : "Deploy Confiance"}
                        </ActionButton>
                        <p className="footnote">
                          Account: <code>{account || "Not deployed"}</code>
                        </p>
                      </article>
                      <article className="panel policy-form funding-panel">
                        <p className="eyebrow">03 · FUNDING</p>
                        <h2>Add funds to your account</h2>
                        <p>
                          Prepare test tokens or transfer tokens you already
                          hold. The owner and agent use testnet MON for
                          transaction fees.
                        </p>
                        <ActionButton
                          pending={busy === "Deploying test token"}
                          pendingLabel={
                            actionCopy("Deploying test token").pending
                          }
                          disabled={
                            disabled ||
                            !owner ||
                            !account ||
                            testFundsCreated ||
                            sessionAssetLocked ||
                            Boolean(state.error)
                          }
                          onClick={() =>
                            void act("Deploying test token", testToken)
                          }
                        >
                          {testFundsCreated
                            ? "Test funds created"
                            : sessionAssetLocked
                              ? "Use your authorized token"
                              : "Deploy & fund CTT test token"}
                        </ActionButton>
                        <p className="footnote">
                          {testFundsCreated
                            ? "1,000 CTT have been added to this account. Your new token is selected below and in the agent’s permission form."
                            : sessionAssetLocked
                              ? "Your current session uses an approved token. Add that token with the form below, or revoke the session before setting up a different test token."
                              : "Create a fresh CTT test token and add 1,000 units directly to this account. Having a token address selected does not mean this account is funded."}{" "}
                          Test tokens do not enforce A-Pass. Cleanverse
                          enrollment and a compliant transfer remain pending.
                        </p>
                        <div className="funding-fields">
                          {" "}
                          <label>
                            Token to fund
                            <input
                              value={asset}
                              onChange={(e) => setAsset(e.target.value)}
                              placeholder="0x…"
                            />
                          </label>
                          <label>
                            Fund treasury · token units
                            <input
                              value={fund}
                              onChange={(e) => setFund(e.target.value)}
                              inputMode="decimal"
                            />
                          </label>
                        </div>{" "}
                        <ActionButton
                          pending={busy === "Funding treasury"}
                          pendingLabel={actionCopy("Funding treasury").pending}
                          disabled={
                            disabled ||
                            !owner ||
                            !account ||
                            !isAddress(asset) ||
                            !/^\d+(\.\d+)?$/.test(fund) ||
                            !/[1-9]/.test(fund) ||
                            Boolean(state.error)
                          }
                          onClick={() => void act("Funding treasury", funding)}
                        >
                          Transfer tokens to Confiance
                        </ActionButton>
                        <p className="footnote">
                          {!owner
                            ? "Sign in to transfer tokens from your owner wallet."
                            : !account
                              ? "Deploy Confiance before funding it."
                              : "Transfers the selected token from your owner wallet. Enter an amount you hold; this does not change session authority."}
                        </p>
                      </article>
                    </>
                  )}
                  {section === "agent" && (
                    <article className="panel">
                      <p className="eyebrow">02 · AGENT</p>
                      <h2>A separate signer.</h2>
                      <p>
                        Privy provides the agent wallet. Confiance determines
                        what that wallet is allowed to spend.
                      </p>
                      <ActionButton
                        pending={busy === "Connecting Privy wallet"}
                        pendingLabel={
                          actionCopy("Connecting Privy wallet").pending
                        }
                        className="primary"
                        disabled={
                          disabled ||
                          !owner ||
                          !state.setupCapabilities?.privy ||
                          Boolean(state.agentWalletConnected) ||
                          Boolean(state.error)
                        }
                        onClick={() =>
                          void act("Connecting Privy wallet", provision)
                        }
                      >
                        {state.agentWalletConnected
                          ? "Agent wallet connected"
                          : agent
                            ? "Connect Privy agent wallet"
                            : "Create Privy agent wallet"}
                      </ActionButton>
                      <p className="footnote">
                        Agent: <code>{agent || "Not connected"}</code>
                      </p>
                      <p className="footnote">
                        Gas balance: {state.agentGas ?? "Unavailable"} MON.{" "}
                        {state.agentWalletConnected
                          ? "This separate wallet signs agent transactions."
                          : !state.setupCapabilities?.privy
                            ? "Configure the project’s Privy app credentials first."
                            : "Sign in to create or verify the agent wallet."}{" "}
                        The agent needs testnet MON for transaction fees.
                      </p>
                      <ActionButton
                        pending={busy === "Registering ERC-8004 identity"}
                        pendingLabel={
                          actionCopy("Registering ERC-8004 identity").pending
                        }
                        disabled={
                          disabled ||
                          !owner ||
                          !state.agentWalletConnected ||
                          !state.setupCapabilities?.identity ||
                          identityRegistered ||
                          Boolean(state.error)
                        }
                        onClick={() =>
                          void act("Registering ERC-8004 identity", identity)
                        }
                      >
                        {identityRegistered
                          ? `Identity registered · #${state.identity?.id}`
                          : "Register ERC-8004 identity"}
                      </ActionButton>
                      <p className="footnote">
                        {identityRegistered
                          ? "The registry confirms this identity belongs to the connected agent wallet. No new registration is needed."
                          : "Connect the Privy wallet and configure the live registry and a public registration document. The agent signs its own registration."}
                      </p>
                    </article>
                  )}
                  {section === "agent" && (
                    <article className="panel policy-form" id="permissions">
                      <p className="eyebrow">03 · PERMISSIONS</p>
                      <h2>Permissions</h2>
                      <p>
                        Set the payment task and approve its financial rules.
                        Task details are stored by Confiance; no server
                        configuration edits are needed.
                      </p>
                      <label>
                        Contractor payment · token units
                        <input
                          value={paymentAmount}
                          onChange={(e) => {
                            setAmountEdited(true);
                            setPaymentAmount(e.target.value);
                          }}
                          inputMode="decimal"
                        />
                      </label>
                      {approvedPolicyHash && (
                        <ActionButton
                          pending={busy === "Saving payroll task"}
                          pendingLabel="Saving task…"
                          disabled={disabled || !owner}
                          onClick={() =>
                            void act("Saving payroll task", () => saveTask())
                          }
                        >
                          Save task from approved policy
                        </ActionButton>
                      )}
                      {state.taskMilestone && (
                        <div className="policy-task-preset">
                          <p>
                            Configured payroll milestone:{" "}
                            {state.taskMilestone.repo} · PR #
                            {state.taskMilestone.pr}
                          </p>
                          <button
                            disabled={disabled}
                            onClick={() => {
                              const task = state.taskMilestone;
                              if (!task) return;
                              setRepo(task.repo);
                              setPr(String(task.pr));
                            }}
                          >
                            Use configured payroll milestone
                          </button>
                          <p className="footnote">
                            Selecting the milestone edits the form. Save policy
                            changes with your owner passkey to update
                            permission.
                          </p>
                        </div>
                      )}
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
                        Milestone writes are restricted to the configured CRE
                        reporter. This form cannot verify a milestone. Recipient
                        restriction is an exact owner-pinned address.
                      </p>
                      <div className="button-row">
                        <ActionButton
                          pending={busy === "Authorizing session"}
                          pendingLabel={
                            actionCopy("Authorizing session").pending
                          }
                          className="primary"
                          disabled={disabled || !actions.create.enabled}
                          onClick={() =>
                            void act("Authorizing session", () => authorize())
                          }
                        >
                          {actions.create.label}
                        </ActionButton>
                        <ActionButton
                          pending={busy === "Updating policy"}
                          pendingLabel={actionCopy("Updating policy").pending}
                          disabled={disabled || !actions.update.enabled}
                          onClick={() =>
                            void act("Updating policy", () => authorize(true))
                          }
                        >
                          {actions.update.label}
                        </ActionButton>
                      </div>
                      {(actions.create.reason || actions.update.reason) && (
                        <p className="footnote">
                          {actions.create.reason}
                          {session?.active && actions.update.reason
                            ? ` ${actions.update.reason}`
                            : ""}
                        </p>
                      )}
                      {session?.active && !session.expired && (
                        <p className="footnote">
                          A session is already active. To use a different token,
                          revoke the session under Agent → Permissions, then
                          return here and authorize a new session. Saving policy
                          changes keeps the current token and spending, and
                          renews expiry to 24 hours from now.
                        </p>
                      )}
                      {session && (!session.active || session.expired) && (
                        <p className="footnote">
                          Authorizing a new session grants a fresh total budget
                          for 24 hours. Previous payments remain in history.
                        </p>
                      )}
                      <div className="boundary permission-revoke">
                        <p className="eyebrow">THE AUTHORITY BOUNDARY</p>
                        <h3>
                          The key still exists.
                          <br />
                          <span>The authority does not.</span>
                        </h3>
                        <p>
                          Revoke the session. The same agent wallet can keep its
                          key, but Confiance stops its next request.
                        </p>
                        <ActionButton
                          pending={busy === "Revoking session"}
                          pendingLabel={actionCopy("Revoking session").pending}
                          className="danger"
                          disabled={disabled || !actions.revoke.enabled}
                          onClick={() =>
                            void act("Revoking session", async () => {
                              if (!account || !agent)
                                throw new Error("No session.");
                              await send(
                                account,
                                encodeFunctionData({
                                  abi: confianceAbi,
                                  functionName: "revokeSession",
                                  args: [agent],
                                }),
                              );
                              setNotice({
                                title: "Payroll Agent’s permission is revoked",
                                message:
                                  "The agent can no longer spend from your Confiance account. Its wallet still exists, but its permission is gone.",
                                nextStep:
                                  "Use Retry after revocation to demonstrate that its next payment is blocked.",
                              });
                            })
                          }
                        >
                          {actions.revoke.label}
                        </ActionButton>
                        <p className="footnote">
                          {actions.revoke.reason ||
                            "Revocation takes effect onchain. The agent keeps its wallet but loses permission to spend."}
                        </p>
                      </div>
                    </article>
                  )}
                  {section === "settings" && (
                    <div className="settings-sections">
                      <article className="panel policy-form">
                        <p className="eyebrow">04 · CONNECTIONS</p>
                        <h2>Integration settings</h2>

                        {state.readiness.map((item) => (
                          <div className="connection" key={item.name}>
                            <span
                              className={
                                item.ready ? "ready-dot" : "missing-dot"
                              }
                            />
                            <div>
                              <strong>{item.name}</strong>
                              <p>{item.detail}</p>
                            </div>
                            <small>
                              {item.ready ? "Configured" : "Required"}
                            </small>
                          </div>
                        ))}
                      </article>
                      <article className="panel policy-form reporter-panel">
                        <p className="eyebrow">MILESTONE VERIFICATION</p>
                        <h2>Authorized reporter</h2>
                        <p>
                          Choose which reporting service can verify the work
                          before your agent pays.
                        </p>
                        {state.reporterSetup && (
                          <p className="footnote">
                            Loaded from configured deployment metadata. Review
                            these values before approving with your owner
                            passkey. They become authorized only after the
                            transaction confirms onchain.
                          </p>
                        )}
                        <label>
                          Authorized CRE forwarder
                          <input
                            value={forwarder}
                            onChange={(e) => {
                              setReporterEdited(true);
                              setForwarder(e.target.value);
                            }}
                            placeholder="Confirmed Monad testnet forwarder"
                          />
                        </label>
                        <label>
                          Deployed workflow ID
                          <input
                            value={workflowId}
                            onChange={(e) => {
                              setReporterEdited(true);
                              setWorkflowId(e.target.value);
                            }}
                            placeholder="0x… (32 bytes)"
                          />
                        </label>
                        <label>
                          Workflow owner
                          <input
                            value={workflowOwner}
                            onChange={(e) => {
                              setReporterEdited(true);
                              setWorkflowOwner(e.target.value);
                            }}
                            placeholder="0x…"
                          />
                        </label>
                        <ActionButton
                          pending={busy === "Authorizing CRE reporter"}
                          pendingLabel={
                            actionCopy("Authorizing CRE reporter").pending
                          }
                          disabled={
                            disabled ||
                            !owner ||
                            !account ||
                            !reporterValid ||
                            reporterMatches ||
                            !state.configured ||
                            Boolean(state.error)
                          }
                          onClick={() =>
                            void act(
                              "Authorizing CRE reporter",
                              configureReporter,
                            )
                          }
                        >
                          {reporterMatches
                            ? "Reporter authorized"
                            : reporterExists
                              ? "Update CRE reporter"
                              : "Authorize CRE reporter"}
                        </ActionButton>
                        <p className="footnote">
                          {reporterMatches
                            ? "These reporter settings already match the authorization onchain. No repeat approval is needed. CRE must still deliver the actual milestone report."
                            : !owner
                              ? "Sign in to approve reporter settings with the owner passkey."
                              : !reporterValid
                                ? "Enter a valid forwarder, deployed workflow ID and workflow owner."
                                : "Approve these settings onchain. Changing them changes which CRE workflow can verify milestones."}
                        </p>
                      </article>
                      <article className="panel policy-form compliance-panel">
                        {" "}
                        <CleanverseRegistration
                          account={account}
                          signedIn={Boolean(owner)}
                          disabled={disabled}
                        />
                      </article>
                    </div>
                  )}
                </section>
              )}
            </>
            {section === "agent" && (
              <details
                className="panel transcript permission-tests"
                id="test-permissions"
              >
                <summary>Test permissions</summary>
                <div className="section-title">
                  <h3>Test the boundaries</h3>
                  <span>Deterministic security demo · agent signer</span>
                </div>
                <p className="footnote">
                  These controls submit real rejected transactions using Privy.
                  They are security diagnostics, separate from the LLM’s
                  decisions. Each operation costs agent testnet gas.
                </p>
                <div className="button-row">
                  <ActionButton
                    pending={busy === "Testing spending limit"}
                    pendingLabel={actionCopy("Testing spending limit").pending}
                    disabled={disabled || !actions.limit.enabled}
                    title={actions.limit.reason}
                    onClick={() =>
                      void act("Testing spending limit", () =>
                        attack("attack-limit"),
                      )
                    }
                  >
                    Attempt 500 tokens
                  </ActionButton>
                  <ActionButton
                    pending={busy === "Testing milestone condition"}
                    pendingLabel={
                      actionCopy("Testing milestone condition").pending
                    }
                    disabled={disabled || !actions.condition.enabled}
                    title={actions.condition.reason}
                    onClick={() =>
                      void act("Testing milestone condition", () =>
                        attack("attack-condition"),
                      )
                    }
                  >
                    Attempt before verification
                  </ActionButton>
                  <ActionButton
                    pending={busy === "Testing recipient rule"}
                    pendingLabel={actionCopy("Testing recipient rule").pending}
                    disabled={disabled || !actions.recipient.enabled}
                    title={actions.recipient.reason}
                    onClick={() =>
                      void act("Testing recipient rule", () =>
                        attack("attack-recipient"),
                      )
                    }
                  >
                    Attempt wrong recipient
                  </ActionButton>
                  <ActionButton
                    pending={busy === "Retrying with revoked key"}
                    pendingLabel={
                      actionCopy("Retrying with revoked key").pending
                    }
                    disabled={disabled || !actions.revoked.enabled}
                    title={actions.revoked.reason}
                    onClick={() =>
                      void act("Retrying with revoked key", () =>
                        attack("attack-revoked"),
                      )
                    }
                  >
                    Retry after revocation
                  </ActionButton>
                </div>
                {diagnosticHints.map((hint) => (
                  <p key={hint} className="footnote">
                    {hint}
                  </p>
                ))}
                {attackProof && (
                  <div className="notice">
                    <strong>Payment blocked</strong>
                    <p>{blockedPayment(attackProof.reason).message}</p>
                    <p className="footnote">
                      Confirmed failed transaction · block {attackProof.block}.
                      The reason was checked before submission.
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
              </details>
            )}
          </>
        )}
        <footer>
          <Link href="/" aria-label="Confiance home">
            <ConfianceLogo size={24} />
          </Link>
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
    </div>
  );
}
