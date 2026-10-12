"use client";

import React from "react";

const items = [
  {
    agent: "payroll.agent",
    network: "Monad Testnet",
    action: "requested",
    amount: "$30.00 CTT",
    status: "verified & paid",
    accent: true,
  },
  {
    agent: "firewall.guard",
    network: "Policy Check",
    action: "limit enforced",
    amount: "Max $50.00",
    status: "active",
    accent: false,
  },
  {
    agent: "cre.workflow",
    network: "Chainlink CRE",
    action: "PR #42 merged",
    amount: "Commit 8f4e2",
    status: "onchain reported",
    accent: true,
  },
  {
    agent: "mera.owner",
    network: "Passkey EOA",
    action: "session established",
    amount: "24h duration",
    status: "authorized",
    accent: false,
  },
  {
    agent: "security.test",
    network: "Monad RPC",
    action: "attempted $500",
    amount: "Exceeds Limit",
    status: "reverted onchain",
    accent: true,
  },
  {
    agent: "privy.signer",
    network: "Agent EOA",
    action: "ERC-8004 identity",
    amount: "Identity #1042",
    status: "registered",
    accent: false,
  },
  {
    agent: "confiance.core",
    network: "0x3f…91",
    action: "revocation check",
    amount: "Key exists",
    status: "authority removed",
    accent: true,
  },
];

export function MarqueeTicker() {
  const repeated = [...items, ...items, ...items];

  return (
    <div
      className="ticker-wrap"
      style={{
        maskImage:
          "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div className="ticker-track animate-marquee">
        {repeated.map((item, idx) => (
          <div key={idx} className="ticker-item">
            <span
              className="ticker-dot"
              style={
                item.accent
                  ? {
                      background: "#9B7FD4",
                      boxShadow: "0 0 8px #9B7FD4",
                    }
                  : { background: "rgba(255,255,255,0.3)" }
              }
            />
            <span className="ticker-agent">{item.agent}</span>
            <span className="ticker-muted">{item.network}</span>
            <span className="ticker-sep">·</span>
            <span className="ticker-text">{item.action}</span>
            <span className="ticker-sep">·</span>
            <span className="ticker-amount">{item.amount}</span>
            <span className="ticker-sep">·</span>
            <span
              className="ticker-status"
              style={
                item.accent ? { color: "#9B7FD4" } : { color: "var(--muted)" }
              }
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
