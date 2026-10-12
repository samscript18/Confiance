import Link from "next/link";

const faqs = [
  [
    "What does Confiance actually do?",
    "Confiance puts enforceable spending rules between an AI agent and your funds. The agent can request a payment. The contract checks its authority before releasing tokens.",
  ],
  [
    "Do I approve every payment?",
    "You approve the agent’s session during setup: its token, contractor, total allowance, expiry, and required milestone. After setup, the agent uses its separate wallet to request payments within those rules.",
  ],
  [
    "What happens if the agent makes a mistake?",
    "Requests outside the approved session revert. The agent cannot increase its allowance, change the owner, extend its own permission, or mark a milestone verified. A compromised signer still has only the authority you granted.",
  ],
  [
    "Can I stop the agent?",
    "Yes. Revoke its session with your owner passkey. The same agent wallet can still exist, but Confiance stops it from spending through that session.",
  ],
  [
    "Who decides whether a milestone is complete?",
    "The Payroll Agent checks the task, while an authorized Chainlink CRE workflow independently checks the actual GitHub pull request and reports the result to Confiance. The payment condition is read from the contract.",
  ],
  [
    "Is this using real money?",
    "The current application runs on Monad Testnet. Its CTT payment path uses test tokens with no stated dollar value. Keep this environment separate from accounts holding real funds.",
  ],
  [
    "What is the status of compliance?",
    "The current test-token flow restricts payments to an owner-approved address. Cleanverse contract-account enrollment and a compliant token transfer remain separate integration work. CTT payments do not demonstrate A-Pass compliance.",
  ],
  [
    "Is the full autonomous demo complete?",
    "Final validation needs the complete milestone-verification, autonomous-payment, over-limit, and revoked-key sequence. The app shows actual chain state and transaction evidence as these steps complete.",
  ],
] as const;

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/" className="brand">
          C<span>CONFIANCE</span>
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
        <section id="overview" className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-tag">
              <i />
              Built on Monad Testnet
            </span>
            <h1>
              Give your agent
              <br />a job.
              <br />
              <em>Keep the authority.</em>
            </h1>
            <p>
              Let AI handle the work. You set the rules for your money.
              Confiance enforces them every time the agent asks to pay.
            </p>
            <div className="landing-hero-actions">
              <Link href="/app/overview" className="landing-button dark">
                Try Confiance <span>↗</span>
              </Link>
              <a href="#how-it-works" className="landing-button light">
                See how it works ↓
              </a>
            </div>
            <small>Testnet MVP · End-to-end validation in progress</small>
          </div>
          <div
            className="landing-authority-visual"
            aria-label="Owner sets rules, agent requests a payment, Confiance validates, Monad settles"
          >
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="authority-visual-label">THE AUTHORITY BOUNDARY</div>
            <div className="visual-card owner">
              <span className="visual-symbol">◎</span>
              <div>
                <small>YOU</small>
                <strong>Set the rules.</strong>
              </div>
              <span className="visual-check">✓</span>
            </div>
            <div className="visual-connector">↓ bounded permission</div>
            <div className="visual-firewall">
              <span className="visual-monogram">C</span>
              <h2>Confiance</h2>
              <p>
                Allowance. Recipient. Token.
                <br />
                Expiry. Milestone.
              </p>
            </div>
            <div className="visual-card agent">
              <span className="visual-symbol">↗</span>
              <div>
                <small>YOUR AGENT</small>
                <strong>Request a payment.</strong>
              </div>
            </div>
            <div className="visual-settlement">
              <span>↓</span> Monad settles approved requests
            </div>
            <p className="visual-caption">How authorization works</p>
          </div>
        </section>
        <section className="landing-principle">
          <p>The agent gets the ability to act.</p>
          <h2>You decide what it is allowed to do.</h2>
          <div>Intelligence requests. Confiance validates. Monad settles.</div>
        </section>
        <section id="how-it-works" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>
              One approval.
              <br />A clear boundary for every payment.
            </h2>
            <p>
              Set up the agent once, then let it do its job inside an authority
              you can inspect, change, and revoke.
            </p>
          </div>
          <div className="landing-steps">
            {[
              [
                "01",
                "Create your account",
                "Use your owner passkey to connect an account and fund Confiance with test tokens. Your authority stays separate from the agent’s wallet.",
              ],
              [
                "02",
                "Give the agent a session",
                "Choose the approved token and contractor, a maximum total allowance, a session duration, and the milestone required before payment.",
              ],
              [
                "03",
                "Let it check the work",
                "Payroll Agent uses its tools to inspect the task. The authorized verification service reports the real milestone result to the contract.",
              ],
              [
                "04",
                "Watch authority in action",
                "The agent signs its own payment request. Confiance checks the session and either transfers the funds or rejects the request. You can follow the actual receipt.",
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
        <section className="landing-payroll">
          <div>
            <p className="eyebrow">MEET THE PAYROLL AGENT</p>
            <h2>
              The work is done.
              <br />
              The payment follows the rules.
            </h2>
            <p>
              Give the agent a task: pay your approved contractor when the
              required GitHub milestone has been completed. It checks the work
              and its permission before requesting payment.
            </p>
            <p>
              An open pull request keeps payment blocked. A merged pull request
              must still be verified through the authorized reporting path. A
              verified condition lets the agent request the permitted payment.
            </p>
            <Link href="/app/agent" className="landing-button dark">
              Meet your agent ↗
            </Link>
          </div>
          <div className="landing-scenario">
            <p className="eyebrow">EXAMPLE SESSION · TEST TOKEN UNITS</p>
            <h3>A job with boundaries</h3>
            <dl>
              <div>
                <dt>Total allowance</dt>
                <dd>50 tokens</dd>
              </div>
              <div>
                <dt>Requested payment</dt>
                <dd>30 tokens</dd>
              </div>
              <div>
                <dt>Permission lasts</dt>
                <dd>24 hours</dd>
              </div>
              <div>
                <dt>Recipient</dt>
                <dd>Approved contractor</dd>
              </div>
              <div>
                <dt>Required milestone</dt>
                <dd>Merged & verified PR</dd>
              </div>
            </dl>
            <p>
              An illustrative policy. Open the app to see your actual session
              and balances.
            </p>
          </div>
        </section>
        <section id="why-confiance" className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">WHY CONFIANCE</p>
            <h2>
              More useful agents.
              <br />
              Less authority to give away.
            </h2>
            <p>
              Clear rules make autonomous payments easier to understand—and
              easier to stop when they cross a boundary.
            </p>
          </div>
          <div className="landing-features">
            {[
              [
                "◈",
                "A real spending ceiling",
                "The contract tracks cumulative spending. A total allowance limits the whole session, rather than restarting with every request.",
              ],
              [
                "◎",
                "Separate owner and agent",
                "Your passkey controls setup and permission changes. The agent’s Privy wallet signs its own requests. Routine payments do not need your signature.",
              ],
              [
                "◇",
                "Work before payment",
                "Milestone verification is recorded onchain through the authorized CRE reporter. The agent cannot approve its own milestone.",
              ],
              [
                "⊘",
                "Revocation that matters",
                "Remove permission even if the agent still holds its key. Confiance checks the session again on every execution.",
              ],
              [
                "↗",
                "Evidence you can inspect",
                "Follow successful transactions, rejected receipts, and indexed account activity. Settlement is demonstrated by real Monad transaction evidence.",
              ],
              [
                "□",
                "One understandable policy",
                "Know who can act, which token they can use, whom they can pay, how much remains, and when their permission ends.",
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
        <section className="landing-stack">
          <div>
            <p className="eyebrow">BUILT ON REAL CONNECTIONS</p>
            <h2>Each layer has a job.</h2>
            <p>
              Intelligence, authorization, and settlement stay separate.
              Integration status is visible in the app.
            </p>
          </div>
          <div className="stack-list">
            {[
              ["Monad", "Testnet settlement"],
              ["Mera", "Owner passkey account"],
              ["Privy", "Separate agent signer"],
              ["Gemini / Vertex AI", "Agent reasoning and tool use"],
              ["Chainlink CRE", "Independent milestone reporting"],
              ["ERC-8004", "Agent identity"],
              ["Envio", "Indexed account history"],
            ].map(([name, job]) => (
              <div key={name}>
                <strong>{name}</strong>
                <span>{job}</span>
              </div>
            ))}
            <div>
              <strong>Cleanverse</strong>
              <span>Enrollment & transfer verification pending</span>
            </div>
          </div>
        </section>
        <section id="faq" className="landing-section landing-faq">
          <div className="landing-section-head">
            <p className="eyebrow">FAQ</p>
            <h2>
              A few things
              <br />
              you should know.
            </h2>
            <p>Understand the permissions before handing your agent a job.</p>
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
        <section className="landing-final">
          <p className="eyebrow">GIVE IT A JOB. SET ITS BOUNDARY.</p>
          <h2>
            Your agent can act.
            <br />
            <em>You stay in control.</em>
          </h2>
          <p>
            Open Confiance to set up your account, review the rules, and follow
            the Payroll Agent’s real activity.
          </p>
          <Link href="/app/overview" className="landing-button dark">
            Open dashboard ↗
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/" className="brand">
          C<span>CONFIANCE</span>
        </Link>
        <p>Give an AI agent a job without giving it your wallet.</p>
        <a
          href="https://github.com/samscript18/Confiance"
          target="_blank"
          rel="noreferrer"
        >
          View the project ↗
        </a>
      </footer>
    </div>
  );
}
