# Validation results

Verified 2026-10-12 against the current source and pinned dependencies.

## Current results

| Check                                       | Result                                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Foundry contracts                           | PASS: 59 tests, 0 failed, 0 skipped; includes 512 fuzz runs                                                                       |
| TypeScript unit tests                       | PASS: 31 tests                                                                                                                    |
| Strict TypeScript and Next production build | PASS                                                                                                                              |
| Formatting lint                             | PASS                                                                                                                              |
| Production-server browser tests             | PASS: 4 tests; four-item landing navigation, app routing, isolated pages, mobile overflow, authentication and mutation boundaries |
| Desktop/mobile visual inspection            | PASS: public landing and app screenshots inspected                                                                                |
| CRE WASM compilation                        | PASS; updated deployed workflow uses 500,000 report gas                                                                           |
| CRE live delivery                           | PASS: actual authorized ConditionVerified event at Monad block 70418309                                                           |
| Vertex Gemini → Privy → Confiance           | PASS: autonomous 30 CTT payment, block 70422755; no owner payment signature                                                       |
| 500 CTT request                             | PASS: same Privy signer transaction reverted; simulation identified SESSION_SPENDING_LIMIT                                        |
| Reused nonce                                | PASS: same Privy signer transaction reverted, block 70423647; simulation identified INVALID_NONCE                                 |
| Live same-key attempt after revocation      | PASS: same Privy key reverted at block 70425005; session inactive and balances unchanged                                          |
| Cleanverse compliant transfer               | Pending Confiance/recipient enrollment and issuance; adapter fixture tests are not live compliance proof                          |

Exact chain receipts are recorded in [DEPLOYMENTS.md](DEPLOYMENTS.md).
Browser fixtures use an unfunded authentication key and unconfigured application;
they cannot submit payments. Live proofs come from separate actual provider/chain
runs, not the browser fixtures. Direct GitHub agent inspection was rate-limited;
the matching real CRE-verified condition supplied independent milestone evidence.

## Historical initial validation — 2026-10-08

The rows below record the initial unconfigured repository and are superseded by
the current results above for deployed integrations.

| Check                                                                      | Result                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Clean `npm ci` including version-checked type repair                       | PASS                                                                          |
| Solidity 0.8.28 build with `--deny warnings`                               | PASS; no compiler warnings                                                    |
| Foundry contract suite                                                     | PASS: 49 tests, 0 failed, 0 skipped                                           |
| Fuzz spending invariant                                                    | PASS: 512 runs within that suite                                              |
| Solidity formatting                                                        | PASS                                                                          |
| Strict TypeScript including dependency declarations                        | PASS; `skipLibCheck: false`                                                   |
| Runtime/integration unit tests                                             | PASS: 14 tests, 0 failed                                                      |
| Prettier formatting lint                                                   | PASS                                                                          |
| Next.js production build                                                   | PASS                                                                          |
| CRE workflow compilation                                                   | PASS: real SDK workflow compiles to WASM                                      |
| Envio code generation and strict handler typing                            | PASS; no live indexing implied                                                |
| Playwright browser suite                                                   | PASS: 4 tests, 0 failed                                                       |
| Desktop/mobile screenshots                                                 | Inspected; dashboard and setup fit a 390px viewport                           |
| Dependency audit after clean install                                       | PASS: 0 vulnerabilities                                                       |
| Local Anvil signed-transaction smoke                                       | PASS: agent payment; over-limit, replay, same-key revoked transactions revert |
| Configuration preflight                                                    | Expected FAIL: .env absent and required live values missing                   |
| Monad public RPC chain ID                                                  | PASS: 10143                                                                   |
| Cleanverse sandbox discovery/code presence                                 | PASS for recorded third-party addresses; compliance not proven                |
| CRE tenant chain directory                                                 | BLOCKED: authentication refresh returns 403                                   |
| Monad Confiance deployment/payment                                         | NOT RUN: no funded signer                                                     |
| Actual LLM / Privy transaction / physical Mera passkey                     | NOT RUN: credentials, funding and human authenticator required                |
| ERC-8004 registration / CRE workflow / Cleanverse payment / Envio indexing | NOT RUN                                                                       |
| ERC-8004 Monad registry code/version                                       | Verified deployed code and version 2.0.0; no project identity minted          |
| Full live Monad demo                                                       | NOT RUN; definition of done remains unmet                                     |

The local smoke evidence is in ignored `proofs/local-smoke.json`. It records
chain 31337, separate ephemeral owner/agent addresses, a successful payment
receipt, reverted attack receipts and owner revocation. Private keys are not
written. The script stops its temporary Anvil process when complete.

Local smoke results are separate from the later verified Monad receipts.

Browser tests cover honest unconfigured state, disabled execution, owner-only
mutation protection, foreign-origin rejection, signed owner login, challenge
replay rejection and mobile overflow. The signing test uses the actual Mera SDK
with a public, unfunded fixture key. It does not test a physical authenticator.

Unit tests additionally cover strict tool inputs, token precision, actual GitHub
merge evidence, CRE configuration gating, identity commitments, stale identity
rejection after wallet changes, payroll task deduplication and signing-session
termination. SDK declaration repairs change types only and are documented in
[INTEGRATIONS.md](INTEGRATIONS.md).

Follow [SETUP.md](SETUP.md) to provision services, deploy and run the real demo.
