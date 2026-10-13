"use client";

import { useState, useRef, useCallback } from "react";

export function Hero3DCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);
  const [simulatedExecution, setSimulatedExecution] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCoords({ x, y });
  }, []);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0.5, y: 0.5 });
  };

  // Base isometric 3D tilt angles, modulated dynamically when hovered
  const normX = (coords.x - 0.5) * 2; // -1 to 1
  const normY = (coords.y - 0.5) * 2; // -1 to 1

  const rotateX = isHovered ? 12 - normY * 14 : 14;
  const rotateY = isHovered ? 20 + normX * 20 : 22;
  const rotateZ = isHovered ? -10 + normX * 5 : -12;
  const translateY = isHovered ? 8 + normY * 10 : 16;

  const glareX = Math.round(coords.x * 100);
  const glareY = Math.round(coords.y * 100);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="hero-3d-wrap"
    >
      <div className="illustration-notice">
        <strong>Interactive illustration · simulated activity</strong>
        <span>
          Example identities, amounts and activity below are not live account
          data. The simulator submits no transaction.
        </span>
      </div>
      <div
        className="hero-3d-card"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateY(${translateY}px)`,
          transitionDuration: isHovered ? "150ms" : "700ms",
        }}
      >
        {/* Dynamic cursor-following specular glare */}
        <div
          aria-hidden="true"
          className="hero-3d-glare"
          style={{
            background: `radial-gradient(circle 650px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.14), transparent 70%)`,
            opacity: isHovered ? 1 : 0.25,
          }}
        />

        {/* Ambient top-down glass shine gradient */}
        <div className="hero-3d-shine" />

        {/* 3-Column Cockpit Grid */}
        <div className="cockpit-grid">
          {/* Column 1: Workspace & Account Telemetry */}
          <div className="cockpit-col-1">
            <div className="cockpit-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span className="cockpit-badge-icon">
                  <i style={{ height: "4px" }} />
                  <i style={{ height: "10px" }} />
                  <i style={{ height: "6px" }} />
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--foreground)",
                  }}
                >
                  Acme Payroll
                </span>
              </div>
              <span className="badge-active">ACTIVE</span>
            </div>

            <div className="cockpit-nav-list">
              <div className="cockpit-nav-item active">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9B7FD4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span>Payroll Agent</span>
              </div>
              <div className="cockpit-nav-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                <span>Firewall Policy</span>
              </div>
              <div className="cockpit-nav-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 11 3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span>CRE Milestone</span>
              </div>
              <div className="cockpit-nav-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M10 9H8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
                <span>Monad Ledger</span>
              </div>
            </div>

            {/* Session Allowance Card */}
            <div className="cockpit-budget-box">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="mono-sub">SESSION BUDGET</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "#9B7FD4",
                  }}
                >
                  $50.00 Max
                </span>
              </div>
              <p className="cockpit-budget-number">$30.00 Spent</p>
              <div className="budget-bar">
                <div className="budget-bar-fill" style={{ width: "60%" }} />
              </div>
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                $20.00 remaining · Expiry: 23h 48m
              </p>
            </div>

            <div
              style={{
                marginTop: "auto",
                borderTop: "1px solid var(--line)",
                padding: "14px 18px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span className="dot-ping" />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                  }}
                >
                  Onchain Synced · Monad 10143
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Live Activity & Policy Firewall Stream */}
          <div className="cockpit-col-2">
            <div className="cockpit-header">
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                Example Security Feed
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "#9B7FD4",
                  letterSpacing: "0.16em",
                }}
              >
                SIMULATION
              </span>
            </div>

            <ul className="cockpit-feed">
              <li className="cockpit-feed-item active">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "#9B7FD4",
                    }}
                  >
                    TX-EXEC-42
                  </span>
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--muted)",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Just now
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--foreground)",
                    display: "block",
                  }}
                >
                  Example: Payroll Agent → Paid David 30 CTT
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00d294"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Milestone #42 Verified by CRE
                  </span>
                  <span className="badge-ok">OK</span>
                </div>
              </li>

              <li className="cockpit-feed-item danger">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "#fb2c36",
                    }}
                  >
                    ATK-BLOCK-01
                  </span>
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--muted)",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    2m ago
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(237,237,237,0.9)",
                    display: "block",
                  }}
                >
                  Attempted $500 Payment · Exceeds $50
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fb2c36"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  <span style={{ fontSize: "11px", color: "#fb2c36" }}>
                    Reverted: SPENDING_LIMIT_EXCEEDED
                  </span>
                  <span className="badge-danger">!</span>
                </div>
              </li>

              <li className="cockpit-feed-item">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--muted)",
                    }}
                  >
                    CRE-REP-108
                  </span>
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--muted)",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "#7B5FB8" }}>
                    Chainlink CRE
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(237,237,237,0.8)",
                    display: "block",
                  }}
                >
                  GitHub PR #42 Merged → Reported Onchain
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7B5FB8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontSize: "11px", color: "#7B5FB8" }}>
                    conditionVerified = true
                  </span>
                  <span className="badge-dim">✓</span>
                </div>
              </li>

              <li className="cockpit-feed-item">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--muted)",
                    }}
                  >
                    AUTH-MERA-09
                  </span>
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--muted)",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    1h ago
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(237,237,237,0.8)",
                    display: "block",
                  }}
                >
                  Owner Passkey Authorized Session
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00d294"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Agent EOA Pinned · 24h Expiry
                  </span>
                  <span className="badge-dim">OP</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3: Invariant Engine & Live Autonomous Execution Simulator */}
          <div className="cockpit-col-3">
            <div className="cockpit-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--muted)",
                }}
              >
                <span
                  style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
                >
                  Confiance
                </span>
                <span>/</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--foreground)",
                  }}
                >
                  FirewallCore · Monad
                </span>
              </div>
              <span className="badge-active">100% Onchain Enforced</span>
            </div>

            <div style={{ padding: "28px", overflowY: "auto", flex: 1 }}>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                Autonomous Execution Firewall
              </h2>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "20px",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "18px",
                  marginTop: "14px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: "1px solid var(--line)",
                      background: "rgba(255,255,255,0.04)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#00d294"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    Contractor:{" "}
                    <strong style={{ color: "var(--foreground)" }}>
                      David (0x71…b3)
                    </strong>
                  </span>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--muted)",
                  }}
                >
                  Zero Human Confirmation Required
                </div>
              </div>

              {/* Code Invariant Snippet */}
              <div className="cockpit-code-box">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--raised-bg)",
                    padding: "8px 16px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--muted)",
                    }}
                  >
                    contracts/src/Confiance.sol
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--muted)",
                    }}
                  >
                    Tamper-Proof Invariant
                  </span>
                </div>
                <div
                  style={{
                    padding: "16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    lineHeight: "1.7",
                    overflowX: "auto",
                  }}
                >
                  <div style={{ color: "rgba(136, 144, 150, 0.6)" }}>
                    // 1. Verify caller is authorized agent session
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#c084fc" }}>require</span>
                    <span style={{ color: "var(--muted)" }}>(</span>
                    <span style={{ color: "#fcd34d" }}>
                      session.active && block.timestamp &lt;= session.expiry
                    </span>
                    <span style={{ color: "var(--muted)" }}>);</span>
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      color: "rgba(136, 144, 150, 0.6)",
                    }}
                  >
                    // 2. Validate spending limit & external condition
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#c084fc" }}>require</span>
                    <span style={{ color: "var(--muted)" }}>(</span>
                    <span style={{ color: "#6ee7b7" }}>
                      session.spent + amount &lt;= session.spendingLimit
                    </span>
                    <span style={{ color: "var(--muted)" }}>);</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#c084fc" }}>require</span>
                    <span style={{ color: "var(--muted)" }}>(</span>
                    <span style={{ color: "#7dd3fc" }}>
                      verifiedConditions[session.condition]
                    </span>
                    <span style={{ color: "var(--muted)" }}>);</span>
                  </div>
                  <div style={{ marginTop: "8px", color: "#00d294" }}>
                    ✓ Verified onchain: Transfer executed to recipient
                  </div>
                </div>
              </div>

              {/* Interactive Execution Trigger */}
              <div className="cockpit-sim-box">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div>
                    <p className="mono-sub">AUTONOMOUS TRIGGER SIMULATOR</p>
                    <p
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--foreground)",
                      }}
                    >
                      {simulatedExecution
                        ? "✓ Simulation complete — no transaction submitted"
                        : "Click to simulate autonomous agent execution"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSimulatedExecution(true);
                      setTimeout(() => setSimulatedExecution(false), 3500);
                    }}
                    className="sim-button"
                  >
                    {simulatedExecution ? "Simulated!" : "Simulate Payment"}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 7h10v10" />
                      <path d="M7 17 17 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
