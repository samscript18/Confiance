"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  formatEther,
  http,
  isHex,
  type Address,
  type Hex,
} from "viem";
import { monadTestnet } from "../../../../packages/shared/chain";
import {
  confianceAbi,
  confianceBytecode,
} from "../../../../packages/shared/contracts";
import {
  connectOwner,
  hasOwnerCredential,
  ownerAccount,
  ownerError,
} from "../../lib/mera";
import { ActionButton } from "../action-button";
import { ConfianceLogo } from "../logo";
import { MessageModal } from "../message-modal";

const receiptKey = "confiance.hosted-deployment.v1";
type Deployment = { hash: Hex; account: Address; owner: Address };

export default function OwnerSetup() {
  const [known, setKnown] = useState(false);
  const [owner, setOwner] = useState<Address>();
  const [balance, setBalance] = useState<string>();
  const [deployment, setDeployment] = useState<Deployment>();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pendingHash, setPendingHash] = useState<Hex>();
  useEffect(() => {
    setKnown(hasOwnerCredential());
  }, []);

  const transport = () =>
    http(
      process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    );
  const client = () =>
    createPublicClient({
      chain: monadTestnet,
      transport: transport(),
    });

  async function action(label: string, operation: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError("");
    try {
      await operation();
    } catch (error) {
      setError(ownerError(error));
    } finally {
      setBusy("");
    }
  }

  async function signIn() {
    const address = await connectOwner(!known);
    setKnown(true);
    setOwner(address);
    const publicClient = client();
    if ((await publicClient.getChainId()) !== 10143)
      throw new Error("Choose a Monad Testnet connection and try again.");
    setBalance(formatEther(await publicClient.getBalance({ address })));
    const stored = localStorage.getItem(receiptKey);
    if (stored) {
      const value: unknown = JSON.parse(stored);
      if (
        value &&
        typeof value === "object" &&
        "owner" in value &&
        value.owner === address &&
        "hash" in value &&
        typeof value.hash === "string" &&
        isHex(value.hash) &&
        value.hash.length === 66
      ) {
        setPendingHash(value.hash);
        await confirmDeployment(value.hash);
      }
    }
  }

  async function confirmDeployment(hash: Hex) {
    const publicClient = client();
    if ((await publicClient.getChainId()) !== 10143)
      throw new Error("This setup requires Monad Testnet.");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 2,
    });
    const account = ownerAccount();
    const transaction = await publicClient.getTransaction({ hash });
    const data = encodeDeployData({
      abi: confianceAbi,
      bytecode: confianceBytecode,
      args: [account.address],
    });
    if (
      receipt.status !== "success" ||
      !receipt.contractAddress ||
      transaction.to !== null ||
      transaction.from.toLowerCase() !== account.address.toLowerCase() ||
      transaction.input !== data ||
      (await publicClient.readContract({
        address: receipt.contractAddress,
        abi: confianceAbi,
        functionName: "owner",
      })) !== account.address
    )
      throw new Error("The account deployment could not be confirmed.");
    const record = {
      hash,
      account: receipt.contractAddress,
      owner: account.address,
    };
    localStorage.setItem(receiptKey, JSON.stringify(record));
    setDeployment(record);
    setPendingHash(undefined);
  }

  async function deploy() {
    const publicClient = client();
    if ((await publicClient.getChainId()) !== 10143)
      throw new Error("This setup requires Monad Testnet.");
    const account = ownerAccount();
    const wallet = createWalletClient({
      account,
      chain: monadTestnet,
      transport: transport(),
    });
    const data = encodeDeployData({
      abi: confianceAbi,
      bytecode: confianceBytecode,
      args: [account.address],
    });
    const gas = await publicClient.estimateGas({ account, data });
    const hash = await wallet.sendTransaction({
      data,
      gas: (gas * 110n + 99n) / 100n,
    });
    // Public transaction metadata only; preserve pending submissions across refresh.
    localStorage.setItem(
      receiptKey,
      JSON.stringify({ owner: account.address, hash }),
    );
    setPendingHash(hash);
    await confirmDeployment(hash);
  }

  return (
    <main className="owner-setup-page">
      <header className="owner-setup-header">
        <Link href="/" aria-label="Confiance home">
          <ConfianceLogo />
        </Link>
        <Link href="/app/account">Back to your workspace ↗</Link>
      </header>
      <p className="eyebrow">YOUR LIVE OWNER</p>
      <h1>Your authority, on this domain.</h1>
      <p className="subtle">
        Create a passkey for this website and a new Monad Testnet account. Your
        previous account and payment proofs stay preserved.
      </p>
      <section className="panel">
        <p className="eyebrow">01 · YOUR PASSKEY</p>
        <h2>
          {owner ? "Your owner is ready." : "Keep your authority with you."}
        </h2>
        <p>
          Use a passkey provider that supports WebAuthn PRF. Keep this website
          address: your localhost passkey belongs to a different domain.
        </p>
        <ActionButton
          className="primary"
          pending={busy === "passkey"}
          pendingLabel="Opening your passkey…"
          disabled={Boolean(busy)}
          onClick={() => void action("passkey", signIn)}
        >
          {known ? "Sign in with live passkey" : "Create live passkey"}
        </ActionButton>
        {owner && <p className="owner-setup-address">Owner: {owner}</p>}
      </section>
      {owner && (
        <section className="panel">
          <p className="eyebrow">02 · TESTNET FUNDING</p>
          <h2>Add gas for setup.</h2>
          <p>
            Request testnet MON for the owner address above. This pays for
            account creation and later permission changes.
          </p>
          <div className="button-row">
            <a
              className="action-button primary"
              href="https://testnet.monad.xyz/"
              target="_blank"
              rel="noreferrer"
            >
              Open Monad faucet ↗
            </a>
            <ActionButton
              pending={busy === "balance"}
              pendingLabel="Checking funds…"
              disabled={Boolean(busy)}
              onClick={() =>
                void action("balance", async () => {
                  const publicClient = client();
                  if ((await publicClient.getChainId()) !== 10143)
                    throw new Error("This setup requires Monad Testnet.");
                  setBalance(
                    formatEther(
                      await publicClient.getBalance({ address: owner }),
                    ),
                  );
                })
              }
            >
              Check funding
            </ActionButton>
          </div>
          <p>Owner balance: {balance ?? "Checking…"} MON</p>
        </section>
      )}
      {owner && (
        <section className="panel">
          <p className="eyebrow">03 · YOUR CONFIANCE ACCOUNT</p>
          <h2>
            {deployment
              ? "Your new account is created."
              : "Establish your account."}
          </h2>
          <p>
            Your live passkey will own this account. Connecting it to Payroll
            Agent is a separate setup step; creating it grants no spending
            permission.
          </p>
          {!deployment && (
            <ActionButton
              className="primary"
              pending={busy === "deploy"}
              pendingLabel="Creating your account…"
              disabled={Boolean(busy) || !balance || Number(balance) <= 0}
              onClick={() =>
                void action("deploy", () =>
                  pendingHash ? confirmDeployment(pendingHash) : deploy(),
                )
              }
            >
              {pendingHash ? "Check submitted deployment" : "Deploy Confiance"}
            </ActionButton>
          )}
          {(deployment?.hash || pendingHash) && (
            <a
              className="tx-link"
              href={`${monadTestnet.blockExplorers.default.url}/tx/${deployment?.hash || pendingHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View account deployment ↗
            </a>
          )}
          {deployment && (
            <>
              <p className="owner-setup-address">
                Account: {deployment.account}
              </p>
              <p>
                Share this public deployment hash with your project operator to
                connect the hosted agent, milestone verification and history.
                Your workspace will be ready once that connection is confirmed.
              </p>
              <code className="owner-setup-address">{deployment.hash}</code>
            </>
          )}
        </section>
      )}
      {error && (
        <MessageModal
          tone="error"
          title="Setup needs attention"
          message={error}
          onDismiss={() => setError("")}
        />
      )}
    </main>
  );
}
