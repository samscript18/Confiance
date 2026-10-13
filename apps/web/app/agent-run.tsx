"use client";

import React, { type ReactNode } from "react";
import { payrollFeedback } from "../lib/feedback";
import { paymentProof, runCheck, type RunRow } from "../lib/agent-run";
import { monadTestnet } from "../../../packages/shared/chain";

// A deliberately small text-only formatter. Model HTML is never injected.
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, index) =>
      part.startsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}
function Explanation({ text }: { text: string }) {
  return (
    <div className="run-explanation-copy">
      {text.split(/\n\s*\n/).map((block, index) => {
        const lines = block.trim().split("\n");
        if (!block.trim()) return null;
        if (/^[-*_]{3,}$/.test(block.trim())) return <hr key={index} />;
        if (lines.length === 1 && /^#{1,6}\s/.test(block))
          return <h4 key={index}>{inline(block.replace(/^#{1,6}\s+/, ""))}</h4>;
        if (lines.every((line) => /^\s*[-*]\s+/.test(line)))
          return (
            <ul key={index}>
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        return <p key={index}>{inline(block)}</p>;
      })}
    </div>
  );
}

export default function AgentRun({
  rows,
  symbol,
  asset,
}: {
  rows: RunRow[];
  symbol?: string | undefined;
  asset?: string | undefined;
}) {
  const proof = paymentProof(rows);
  const outcome = payrollFeedback(proof?.confirmed ? [proof.row] : rows);
  const checks = rows.filter((row) => row.kind === "tool");
  const explanations = rows.filter((row) => row.kind === "reasoning");
  const amount =
    proof?.confirmed &&
    typeof proof.data.amount === "string" &&
    /^\d+(\.\d+)?$/.test(proof.data.amount)
      ? proof.data.amount
      : undefined;
  const denomination =
    typeof proof?.data.asset === "string" &&
    proof.data.asset.toLowerCase() === asset?.toLowerCase()
      ? symbol || "token units"
      : "token units";
  return (
    <section
      className="panel transcript agent-run"
      aria-label="Latest agent run"
    >
      <header className="run-header">
        <div>
          <p className="eyebrow">PAYROLL AGENT</p>
          <h2>Latest agent run</h2>
          <p className="subtle">
            What the agent checked, what happened, and the evidence behind it.
          </p>
        </div>
        <span className={`run-status run-status-${outcome.tone || "info"}`}>
          <span aria-hidden="true">{proof?.confirmed ? "✓" : "◎"}</span>
          {proof?.confirmed
            ? "Payment confirmed"
            : outcome.tone === "blocked"
              ? "Payment blocked"
              : proof
                ? "Awaiting confirmation"
                : "Run reviewed"}
        </span>
      </header>
      <div className={`run-outcome run-outcome-${outcome.tone || "info"}`}>
        <div>
          <p className="run-label">RESULT</p>
          <h3>{outcome.title}</h3>
          <p>{outcome.message}</p>
        </div>
        {amount && (
          <div className="run-payment-amount">
            <strong>{amount}</strong>
            <span>{denomination}</span>
          </div>
        )}
        {proof && (
          <a
            className="action-button"
            href={`${monadTestnet.blockExplorers.default.url}/tx/${proof.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction ↗
          </a>
        )}
      </div>
      {proof?.confirmed && (
        <dl className="run-receipt">
          {typeof proof.data.blockNumber === "string" && (
            <div>
              <dt>Confirmed in block</dt>
              <dd>{proof.data.blockNumber}</dd>
            </div>
          )}
          {typeof proof.data.recipient === "string" &&
            /^0x[0-9a-f]{40}$/i.test(proof.data.recipient) && (
              <div>
                <dt>Paid to</dt>
                <dd title={proof.data.recipient}>
                  {proof.data.recipient.slice(0, 8)}…
                  {proof.data.recipient.slice(-6)}
                </dd>
              </div>
            )}
          <div>
            <dt>Payment signer</dt>
            <dd>Agent wallet</dd>
          </div>
        </dl>
      )}
      <div className="run-checks-heading">
        <h3>Checks during this run</h3>
        <span>{checks.length} recorded</span>
      </div>
      <ol className="run-checks">
        {checks.map((row, index) => {
          const check = runCheck(row);
          return (
            <li className={`run-check run-check-${check.tone}`} key={index}>
              <span className="run-check-icon" aria-hidden="true">
                {check.tone === "success"
                  ? "✓"
                  : check.tone === "warning"
                    ? "!"
                    : "·"}
              </span>
              <div className="run-check-body">
                <div className="run-check-title">
                  <h4>{check.title}</h4>
                  <span className={`run-check-tag run-check-tag-${check.tone}`}>
                    {check.label}
                  </span>
                </div>
                <p>{check.message}</p>
                <details className="run-evidence">
                  <summary>Inspect recorded evidence</summary>
                  <pre>{row.content}</pre>
                </details>
              </div>
            </li>
          );
        })}
      </ol>
      {explanations.length > 0 && (
        <details className="run-explanation">
          <summary>
            <span>
              Read the agent’s explanation
              <small>
                The agent’s interpretation; confirmed results are shown above.
              </small>
            </span>
          </summary>
          {explanations.map((row, i) => (
            <Explanation key={i} text={row.content} />
          ))}
        </details>
      )}
    </section>
  );
}
