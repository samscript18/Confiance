"use client";
import { useState } from "react";
import type { Address } from "viem";
import { ownerAccount } from "../lib/mera";
import { MessageModal } from "./message-modal";
import type { Feedback } from "../lib/feedback";
import { cleanverseFailure } from "../lib/cleanverse-feedback";

export default function CleanverseRegistration({
  account,
  signedIn,
  disabled,
}: {
  account: Address | undefined;
  signedIn: boolean;
  disabled: boolean;
}) {
  const [group, setGroup] = useState("");
  const [issuerRule, setIssuerRule] = useState("");
  const [subgroup, setSubgroup] = useState("");
  const [tier, setTier] = useState("");
  const [subtier, setSubtier] = useState("");
  const [countries, setCountries] = useState("");
  const [blocklist, setBlocklist] = useState(true);
  const [busy, setBusy] = useState<"status" | "register" | undefined>();
  const [registered, setRegistered] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const [hash, setHash] = useState<string>();
  async function submit(register: boolean) {
    if (!account) return;
    setBusy(register ? "register" : "status");
    setFeedback(undefined);
    try {
      let body: Record<string, unknown> = { action: "status" };
      if (register) {
        const rule = {
          allowed_group: issuerRule === "any" ? "" : group.trim(),
          allowed_sub_group: subgroup.trim(),
          min_tier: Number(tier),
          min_sub_tier: Number(subtier),
          is_black_list: blocklist,
          countries: countries
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean),
        };
        const signature = await ownerAccount().signMessage({
          message: `monad${account.toLowerCase()}`,
        });
        body = { action: "register", rule, signature };
        setAttempted(true);
      }
      const response = await fetch("/api/cleanverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const value: unknown = await response.json();
      if (!value || typeof value !== "object") throw new Error();
      const result = value as Record<string, unknown>;
      if (!response.ok || result.status === "rejected") {
        setFeedback(cleanverseFailure(result.reason));
        return;
      }
      if (
        typeof result.hash === "string" &&
        /^0x[0-9a-f]{64}$/i.test(result.hash)
      )
        setHash(result.hash);
      const confirmed =
        result.onchain === true || result.status === "registered";
      setRegistered(confirmed);
      if (!register && result.apiRegistered === false && !confirmed && !hash)
        setAttempted(false);
      setFeedback({
        title: confirmed
          ? "Account registered"
          : register || result.apiRegistered === true
            ? "Registration is pending"
            : "Account not registered",
        tone: confirmed ? "success" : "info",
        message: confirmed
          ? "Your account is registered onchain. Identity issuance, contractor eligibility and a compliant payment still need verification."
          : register || result.apiRegistered === true
            ? "Cleanverse accepted the request. Check again for onchain registration; no compliance or payment is confirmed yet."
            : "Your account is not registered yet. Choose the intended eligibility rules before registering.",
      });
    } catch {
      setFeedback({
        title: "Registration needs attention",
        tone: "error",
        message:
          "We couldn’t confirm registration. Check your owner sign-in and server credentials, then check status before retrying.",
      });
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <section
      className="cleanverse-registration"
      aria-label="Cleanverse registration"
    >
      <h3>Register with Cleanverse</h3>
      <p className="subtle">
        Enroll your existing Confiance account on Monad Testnet. Registration is
        separate from identity issuance and compliant payments.
      </p>
      <p className="footnote">
        Choose the group and tiers intended for your sandbox integration. No
        example rules are preselected.{" "}
        <a
          href="https://docs.cleanverse.com/api/validator/validator-register"
          target="_blank"
          rel="noreferrer"
        >
          Read the eligibility requirements ↗
        </a>
      </p>
      <label>
        Accepted identity issuer
        <select
          value={issuerRule}
          onChange={(e) => setIssuerRule(e.target.value)}
        >
          <option value="">Choose an issuer rule</option>
          <option value="any">Any issuer (no group restriction)</option>
          <option value="specific">Only a specified issuer group</option>
        </select>
      </label>
      {issuerRule === "specific" && (
        <label>
          CVI issuer group (two letters, case-sensitive)
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Group code for your integration"
          />
        </label>
      )}
      <label>
        Subgroup (optional)
        <input value={subgroup} onChange={(e) => setSubgroup(e.target.value)} />
      </label>
      <label>
        Minimum tier
        <input
          type="number"
          min="0"
          max="255"
          step="1"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        />
      </label>
      <label>
        Minimum sub-tier
        <input
          type="number"
          min="0"
          max="255"
          step="1"
          value={subtier}
          onChange={(e) => setSubtier(e.target.value)}
        />
      </label>
      <label>
        Country rule
        <select
          value={blocklist ? "block" : "allow"}
          onChange={(e) => setBlocklist(e.target.value === "block")}
        >
          <option value="block">Exclude listed countries</option>
          <option value="allow">Allow only listed countries</option>
        </select>
      </label>
      <label>
        Country codes (comma-separated)
        <input
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          placeholder="Leave empty to exclude no countries"
        />
      </label>
      <div className="button-row">
        <button
          className="action-button"
          aria-busy={busy === "status"}
          disabled={disabled || Boolean(busy) || !signedIn || !account}
          onClick={() => void submit(false)}
        >
          {busy === "status" ? "Checking registration…" : "Check registration"}
        </button>
        <button
          className="action-button primary"
          aria-busy={busy === "register"}
          disabled={
            disabled ||
            Boolean(busy) ||
            !signedIn ||
            !account ||
            registered ||
            attempted ||
            !issuerRule ||
            (issuerRule === "specific" &&
              !/^[A-Za-z]{2}$/.test(group.trim())) ||
            tier === "" ||
            subtier === ""
          }
          onClick={() => void submit(true)}
        >
          {busy === "register"
            ? "Registration pending…"
            : registered
              ? "Registered onchain"
              : attempted
                ? "Check status before retrying"
                : "Sign & register account"}
        </button>
      </div>
      {!signedIn && (
        <p className="footnote">
          Sign in with your owner passkey to check or register your account.
        </p>
      )}
      {feedback && (
        <MessageModal {...feedback} onDismiss={() => setFeedback(undefined)} />
      )}
      {hash && (
        <a
          href={`https://testnet.monadexplorer.com/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction reported by Cleanverse ↗
        </a>
      )}
    </section>
  );
}
