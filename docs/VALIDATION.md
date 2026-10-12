# Validation results

Verified 2026-10-08 against the current local source and pinned lockfile.

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

Local success does not satisfy the project's Monad end-to-end definition of
done. Deployment addresses and live transaction proofs remain absent.

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
