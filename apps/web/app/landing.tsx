"use client";

import Link from "next/link";
import { ConfianceLogo } from "./logo";
import { HeroBackgroundCanvas } from "./hero-canvas";
import { Hero3DCard } from "./hero-3d-card";
import { MarqueeTicker } from "./marquee-ticker";

const faqs = [
  [
    "What does Confiance actually do?",
    "Confiance puts an enforceable onchain execution firewall between an autonomous AI agent and money. The human sets bounded permissions once. The agent requests payments autonomously. Confiance validates every transaction onchain on Monad before releasing tokens — with zero human wallet popups per payment.",
  ],
  [
    "Do I need to sign every payment?",
    "No. You authorize the agent's policy session once during setup: its allowed token, contractor recipient, total cumulative budget ceiling, session expiry, and required external condition. Routine milestone payments are signed by the agent's dedicated Privy wallet and executed autonomously.",
  ],
  [
    "What happens if an agent goes rogue or makes a mistake?",
    "Any transaction exceeding the approved cumulative session budget, targeting an unauthorized recipient, or attempting payment before milestone verification reverts onchain. A compromised agent key still possesses zero authority beyond the strictly bounded policy.",
  ],
  [
    "Can the human owner immediately revoke the agent?",
    "Yes. With one click using your Mera owner passkey, you revoke the session onchain. The agent's private key still exists, but the authority to execute is dead. Any subsequent payment request reverts immediately with SESSION_REVOKED.",
  ],
  [
    "Who verifies that work or milestones are complete?",
    "The Payroll Agent inspects the task using deterministic tools, while an independent Chainlink CRE workflow verifies the real external GitHub PR status and cryptographically writes verification to Confiance onchain. Neither the agent nor any frontend can fake verification.",
  ],
  [
    "What network and tokens does Confiance use?",
    "Confiance executes live on Monad Testnet (Chain ID 10143). The demo scenario uses CTT test tokens minted to the Confiance Smart Account, allowing complete deterministic validation of autonomous payments, limit breaches, and revocation.",
  ],
  [
    "How does Confiance differ from Privy or Mera?",
    "Mera provides passkey authentication to derive the human owner's account. Privy provides a separate signing key for the autonomous agent. Neither provides financial authority. Confiance is the smart-account authorization layer that bounds and governs what that key is permitted to spend.",
  ],
  [
    "What is the status of compliance and Cleanverse?",
    "Confiance establishes clean architectural boundaries for Cleanverse A-Tokens and A-Pass compliance. In the testnet demo, recipient restrictions and exact-address validation are enforced onchain by Confiance's core firewall.",
  ],
] as const;

export default function Landing() {
  return (
    <div className="landing">
      {/* Top Fixed Header */}
      <header className="landing-header">
        <Link href="/" aria-label="Confiance home">
          <ConfianceLogo size={36} />
        </Link>
        <nav aria-label="Website navigation">
          <a href="#overview">Overview</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-confiance">Why Confiance</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Link href="/app/overview" className="landing-button dark">
          Open app ↗
        </Link>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section id="overview" className="landing-hero">
          {/* Background Animation Canvas & Atmospheric Glow Orbs */}
          <div
            aria-hidden="true"
            className="hero-backdrop"
            style={{
              maskImage:
                "linear-gradient(180deg, black 0%, black 75%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, black 0%, black 75%, transparent 100%)",
            }}
          >
            {/* Pulsing Blurred Gradient Spotlights */}
            <div
              className="hero-orb hero-orb-center animate-pulse-glow"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(155, 127, 212, 0.5) 0%, rgba(123, 95, 184, 0.25) 50%, transparent 80%)",
              }}
            />
            <div
              className="hero-orb hero-orb-left"
              style={{
                background:
                  "radial-gradient(circle, rgba(184, 159, 232, 0.35) 0%, rgba(155, 127, 212, 0.15) 60%, transparent 80%)",
              }}
            />
            <div
              className="hero-orb hero-orb-right"
              style={{
                background:
                  "radial-gradient(circle, rgba(133, 108, 208, 0.35) 0%, rgba(155, 127, 212, 0.1) 60%, transparent 80%)",
              }}
            />

            {/* Cybernetic Grid Mesh with Radial Mask */}
            <div
              className="hero-grid-mesh"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "64px 64px",
                maskImage:
                  "radial-gradient(ellipse 65% 50% at 50% 30%, black 0%, transparent 80%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 65% 50% at 50% 30%, black 0%, transparent 80%)",
              }}
            />

            {/* Kinetic Particle & Energy Constellation Canvas */}
            <HeroBackgroundCanvas />
          </div>

          {/* Hero Content */}
          <div className="landing-hero-copy">
            <span className="landing-tag">
              <i />
              Built on Monad Testnet · Bounded Agent Authority
            </span>

            <h1>
              Give your agent a job.
              <br />
              <span>Keep the authority.</span>
            </h1>

            <p>
              The onchain execution firewall for autonomous AI agents on Monad.
              Set spending policy once with your owner passkey. The agent
              requests payments autonomously. Confiance validates every
              transaction onchain with zero human confirmations per payment.
            </p>

            <div className="landing-hero-actions">
              <Link href="/app/overview" className="landing-button dark">
                Try Confiance <span>↗</span>
              </Link>
              <a href="#how-it-works" className="landing-button light">
                See how it works ↓
              </a>
            </div>

            {/* Telemetry Strip */}
            <div className="landing-metrics">
              <div className="metric-item">
                <div className="metric-value">100%</div>
                <div className="metric-label">Onchain Enforced</div>
              </div>
              <div className="divider" />
              <div className="metric-item">
                <div className="metric-value">Zero</div>
                <div className="metric-label">Human Popups</div>
              </div>
              <div className="divider" />
              <div className="metric-item">
                <div className="metric-value accent">Immutable</div>
                <div className="metric-label">Cumulative Limits</div>
              </div>
              <div className="divider" />
              <div className="metric-item">
                <div className="metric-value">1-Click</div>
                <div className="metric-label">Passkey Revoke</div>
              </div>
            </div>
          </div>

          <aside
            className="verified-proof-strip"
            aria-label="Verified Monad transaction evidence"
          >
            <div>
              <p className="eyebrow">REAL MONAD TESTNET EVIDENCE</p>
              <strong>
                0.05 aUSDC paid by the agent. No owner payment signature.
              </strong>
              <p>
                Confirmed in block 70692069. These receipts are separate from
                the illustrative interface below.
              </p>
            </div>
            <div className="button-row">
              <a
                className="landing-button dark"
                href="https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc"
                target="_blank"
                rel="noreferrer"
              >
                Verify real payment ↗
              </a>
              <a
                className="landing-button light"
                href="https://github.com/samscript18/Confiance/blob/dev/docs/DEPLOYMENTS.md"
                target="_blank"
                rel="noreferrer"
              >
                Verified transaction history ↗
              </a>
            </div>
          </aside>

          {/* 3D Interactive Cockpit Card (Moves in 3D on Hover) */}
          <Hero3DCard />

          {/* Animated Marquee Ticker */}
          <MarqueeTicker />
        </section>

        {/* Core Principle Section */}
        <section className="landing-principle">
          <p>The agent gets the ability to act.</p>
          <h2>You decide what it is allowed to do.</h2>
          <div>Intelligence requests. Confiance validates. Monad settles.</div>
        </section>

        {/* How Confiance Works (4 Steps) */}
        <section id="how-it-works" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">HOW CONFIANCE WORKS</p>
            <h2>
              One setup approval.
              <br />
              Autonomous execution forever bounded.
            </h2>
            <p>
              Set up the agent once, then let it do its job inside an authority
              you can inspect, change, and revoke at any second.
            </p>
          </div>

          <div className="landing-steps">
            {[
              [
                "01",
                "Create your account",
                "Authenticate via Mera passkey to deploy and initialize your Confiance smart account. Your owner authority remains strictly separated from the agent's key.",
              ],
              [
                "02",
                "Register agent identity",
                "Create a dedicated agent signer with Privy and establish its onchain identity via ERC-8004. The agent receives its own distinct EVM address.",
              ],
              [
                "03",
                "Configure bounded policy",
                "Establish authorized token, contractor recipient, cumulative budget ceiling ($50), 24h duration, and required external condition (GitHub PR #42).",
              ],
              [
                "04",
                "Autonomous payment",
                "When Chainlink CRE reports PR #42 merged, the agent requests payment autonomously. Confiance validates the policy onchain and Monad settles.",
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span className="step-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Primary Demo Use Case: Payroll Agent */}
        <section className="landing-payroll">
          <div>
            <p className="eyebrow">ILLUSTRATIVE PAYROLL SCENARIO</p>
            <h2>
              The Payroll Agent.
              <br />
              Work verified. Payment bounded.
            </h2>
            <p>
              Acme Corporation gives its Payroll Agent a job: pay contractor
              David 30 token units when GitHub PR #42 is verified merged. These
              names, amounts and PR number illustrate the workflow; the actual
              payment receipts are linked above.
            </p>
            <p>
              While PR #42 remains open, any payment attempt reverts onchain
              with CONDITION_NOT_VERIFIED. When Chainlink CRE cryptographically
              reports completion, the agent executes autonomously. Attempting
              500 token units reverts with SPENDING_LIMIT_EXCEEDED. Revoking the
              session shuts off authority instantly.
            </p>
            <div style={{ marginTop: "16px" }}>
              <Link href="/app/agent" className="landing-button dark">
                Meet Payroll Agent ↗
              </Link>
            </div>
          </div>

          <div className="landing-scenario">
            <p className="eyebrow">EXAMPLE POLICY · NOT LIVE ACCOUNT DATA</p>
            <h3>Example Session Policy</h3>
            <dl>
              <div>
                <dt>Agent Identity</dt>
                <dd>Payroll Agent (ERC-8004)</dd>
              </div>
              <div>
                <dt>Session Budget Ceiling</dt>
                <dd>50 CTT token units</dd>
              </div>
              <div>
                <dt>Requested Payout</dt>
                <dd>30 CTT token units</dd>
              </div>
              <div>
                <dt>Approved Recipient</dt>
                <dd>David (0x71…b3)</dd>
              </div>
              <div>
                <dt>External Milestone</dt>
                <dd>GitHub PR #42 (CRE Verified)</dd>
              </div>
              <div>
                <dt>Session Duration</dt>
                <dd>24 Hours Active</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* The Authority Boundary Interactive Visualization */}
        <section className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">THE ARCHITECTURE</p>
            <h2>The Authority Boundary</h2>
            <p>
              Never give an AI agent unrestricted access to a treasury wallet.
              Confiance decouples the signer from financial authority.
            </p>
          </div>

          <div
            className="landing-authority-visual"
            aria-label="Owner sets rules, agent requests a payment, Confiance validates, Monad settles"
          >
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="authority-visual-label">
              CRYPTOGRAPHIC EXECUTION FIREWALL
            </div>

            <div className="visual-card owner">
              <span className="visual-symbol">◎</span>
              <div>
                <small>HUMAN OWNER (MERA)</small>
                <strong>Establishes Session Authority</strong>
              </div>
              <span className="visual-check">✓</span>
            </div>

            <div className="visual-connector">
              ↓ Bounded Session Policy (Budget · Recipient · Milestone)
            </div>

            <div className="visual-firewall">
              <span className="visual-monogram">C</span>
              <h2>Confiance Smart Account</h2>
              <p>
                Cumulative limit check.
                <br />
                CRE condition verification.
                <br />
                Replay & nonce protection.
              </p>
            </div>

            <div className="visual-card agent" style={{ marginTop: "24px" }}>
              <span className="visual-symbol">↗</span>
              <div>
                <small>AI AGENT (PRIVY SIGNER)</small>
                <strong>Requests Payment Autonomously</strong>
              </div>
            </div>

            <div className="visual-settlement">
              <span>↓</span> Validated: Monad Testnet settles payment without
              human wallet popup
            </div>
            <p className="visual-caption">
              The key still exists. The authority does not.
            </p>
          </div>
        </section>

        {/* Why Confiance (6 Bento Cards) */}
        <section id="why-confiance" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">WHY CONFIANCE</p>
            <h2>
              Give agents capability.
              <br />
              Never surrender treasury authority.
            </h2>
            <p>
              Clear onchain invariants guarantee safety. When an agent model
              hallucinates, the Monad contract ensures unauthorized payments
              revert deterministically.
            </p>
          </div>

          <div className="landing-features">
            {[
              [
                "◈",
                "Cumulative Spending Ceiling",
                "Confiance records every token spent onchain. The $50 session budget is cumulative across the entire session rather than resetting per call.",
              ],
              [
                "◎",
                "Decoupled Key & Authority",
                "Your Mera passkey owns the contract. The agent uses its own Privy wallet. Compromise of the agent key yields zero access to the owner wallet.",
              ],
              [
                "◇",
                "Work-Before-Payment Verification",
                "Milestones are reported directly from Chainlink CRE to the smart account. The agent cannot forge verification or release premature funds.",
              ],
              [
                "⊘",
                "Irrevocable Revocation",
                "Owner can revoke the session onchain in 1 click. The agent retains its private key, but Confiance rejects every subsequent execution attempt.",
              ],
              [
                "↗",
                "Zero Human Confirmations",
                "After initial session setup, payments happen autonomously. No human wallet popups interrupt autonomous agent workflows.",
              ],
              [
                "□",
                "Verifiable Transaction Evidence",
                "Successful executions and policy updates emit events indexed by Envio. Reverted transactions retain no logs: rejected attempts are shown through verified failed receipts, with reasons identified separately by pre-submission simulation.",
              ],
            ].map(([icon, title, text]) => (
              <article key={title}>
                <span className="feature-symbol" aria-hidden="true">
                  {icon}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Stack Integration Grid */}
        <section className="landing-stack">
          <div>
            <p className="eyebrow">INTEGRATIONS</p>
            <h2>Production-grade onchain stack.</h2>
            <p>
              Built specifically for the high-throughput Monad ecosystem,
              integrating leading identity, oracle, and passkey standards.
            </p>
          </div>

          <div className="stack-list">
            {[
              ["Monad Testnet", "High-throughput parallel EVM settlement"],
              ["Mera", "Owner passkey authentication & EVM derivation"],
              ["Privy", "Autonomous agent wallet & key custody"],
              ["Chainlink CRE", "Decentralized GitHub milestone oracle"],
              ["ERC-8004", "Onchain agent identity registry"],
              [
                "Google Gemini / Vertex",
                "Deterministic tool reasoning & task planning",
              ],
              ["Envio", "Real-time indexed execution timeline"],
            ].map(([name, job]) => (
              <div key={name}>
                <strong>{name}</strong>
                <span>{job}</span>
              </div>
            ))}
            <div>
              <strong>Cleanverse A-Tokens</strong>
              <span>Compliance adapter boundary</span>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="landing-section landing-faq">
          <div className="landing-section-head">
            <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
            <h2>
              Everything you need
              <br />
              to know about Confiance.
            </h2>
            <p>
              Understand how bounded execution boundaries safeguard financial
              operations for autonomous agents.
            </p>
          </div>

          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="landing-final">
          <p className="eyebrow">GIVE IT A JOB. KEEP THE AUTHORITY.</p>
          <h2>
            Your agent can act.
            <br />
            <em>You stay in control.</em>
          </h2>
          <p>
            Experience the Payroll Agent executing real transactions on Monad
            Testnet. Inspect the onchain policy, test attack simulations, and
            verify revocation live.
          </p>
          <Link href="/app/overview" className="landing-button dark">
            Open dashboard ↗
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <Link href="/" aria-label="Confiance home">
          <ConfianceLogo size={32} />
        </Link>
        <p>Give an AI agent a job without giving it your wallet.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a
            href="https://testnet.monadexplorer.com"
            target="_blank"
            rel="noreferrer"
          >
            Monad Explorer ↗
          </a>
          <a
            href="https://github.com/samscript18/Confiance"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
