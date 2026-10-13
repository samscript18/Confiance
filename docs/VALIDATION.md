# Validation results

Verified 2026-10-12 against the current source and pinned dependencies.

## Current results

| Check                                       | Result                                                                                                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundry contracts                           | PASS: 59 tests, 0 failed, 0 skipped; includes 512 fuzz runs                                                                                                                                              |
| TypeScript unit tests                       | PASS: 46 tests                                                                                                                                                                                           |
| Strict TypeScript and Next production build | PASS                                                                                                                                                                                                     |
| Formatting lint                             | PASS                                                                                                                                                                                                     |
| Production-server browser tests             | PASS: 19 tests; five signed-out pages at desktop/tablet/mobile sizes, menu controls, private-state withholding and authentication boundaries                                                             |
| Desktop/mobile visual inspection            | PASS: public landing and app screenshots inspected                                                                                                                                                       |
| CRE WASM compilation                        | PASS; updated deployed workflow uses 500,000 report gas                                                                                                                                                  |
| Latest hosted CRE delivery                  | PASS: PR #2 ConditionVerified at block 70465820; [receipt](https://testnet.monadexplorer.com/tx/0x237d5539133dc31be0c9278de41be2c0c883e8d480c0f506c04347dc867036ff)                                      |
| Latest hosted Gemini → Privy → Confiance    | PASS: Render autonomous 30 CTT payment at block 70465941, no owner payment signature; [receipt](https://testnet.monadexplorer.com/tx/0x6eaecc46d20f3513452cb4e0bf6e591c10a3f38285d3cdec9276260e8f46870c) |
| Earlier PR #1 payment rehearsal             | PASS: autonomous 30 CTT at block 70422755; [receipt](https://testnet.monadexplorer.com/tx/0xa9d80f0c7087fe812b527737a440ce63e6801b6acb95e313126ab8ac3a03a5fe); earlier CRE condition at block 70418309   |
| 500 CTT request                             | PASS: same Privy signer transaction reverted; simulation identified SESSION_SPENDING_LIMIT                                                                                                               |
| Reused nonce                                | PASS: same Privy signer transaction reverted, block 70423647; simulation identified INVALID_NONCE                                                                                                        |
| Live same-key attempt after revocation      | PASS: same Privy key reverted at block 70425005; session inactive and balances unchanged                                                                                                                 |
| Cleanverse compliant transfer               | PASS: real 0.05 aUSDC payment at block 70692069; exact execution and token events independently verified                                                                                                 |

The primary hosted evidence is [hosted-payment.json](research/hosted-payment.json),
matching block **70465941**. [DEPLOYMENTS.md](DEPLOYMENTS.md) is the canonical
receipt index. Both payments above belong to the original account
`0x952bbdDeCE639f678733F310890d15E28b213489`. The limit, replay and revocation
diagnostics in the table are from the earlier PR #1 rehearsal, not later steps in the
PR #2 payment's timeline.

The live-domain owner subsequently deployed account
`0xde4dfd84ed78c4c65d7670e22be1e002403f057f` at block **70494094**.
Its deployment is verified and hosted services are connected; its CRE reporter approval is verified onchain. Funding,
session approval and the autonomous 0.05 aUSDC payment are now verified at
block 70692069.

Browser fixtures use an unfunded authentication key and unconfigured application;
they cannot submit payments. Live proofs come from separate actual provider/chain
runs, not the browser fixtures. Direct GitHub agent inspection was rate-limited;
the matching real CRE-verified condition supplied independent milestone evidence.

Hosted validation additionally proves MongoDB restart-safe sign-in, unique payment intents, shared leases,
Render autonomous payment at block 70465941, task-fed CRE at block 70465820 and
Envio Cloud records matching both payments. Public evidence is recorded in research/.

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

## Cleanverse live verification — 2026-10-13

The owner-approved compliant session and real Gemini/Privy payment succeeded:
**0.05 aUSDC**, block **70692069**. The independent audit matched the sender,
exact execution calldata, `PaymentExecuted`, token `Transfer` and updated spent
amount. [Receipt and audit](research/cleanverse-payment.json). Both recipient and
treasury now hold 0.05 aUSDC. Real CVI-negative rejection remains simulation-only
evidence; no such rejection transaction is claimed.

## aUSDC spending-limit proof

[500 aUSDC request](https://testnet.monadexplorer.com/tx/0x7c7034399816faeee275945a19b538a366722a79bc392d5afcbb8792305a1353), block **70693302**, reverted through the same
Privy agent under the 0.1 aUSDC session. Pre-submission simulation identified
`SESSION_SPENDING_LIMIT`. The real reverted receipt, exact sender/target/calldata
and absent logs were checked. This is a deterministic diagnostic, not LLM
reasoning. [Recorded proof](research/cleanverse-limit-rejection.json).

## Same agent key after aUSDC session revocation

The owner [revoked the current session](https://testnet.monadexplorer.com/tx/0x987ca54849ec33ef85602e1ac056695dd27b52ee2a56b4b2a90ea5a23f28255c) at block **70693560**.
The same Privy agent then [retried 30 aUSDC](https://testnet.monadexplorer.com/tx/0xd10888163b2e1e0f7e23f79a505de45613722b0cb60c09940a0c0456b7ece274) at block **70693748**:
the transaction reverted. Pre-submission simulation returned `SESSION_REVOKED`.
The mined receipt and sender/target/calldata were checked. Session generation 5
is inactive; spent and treasury balance remain **0.05 aUSDC**. No human signed
the retry. [Paired receipt audit](research/cleanverse-revoked-rejection.json).

**The key still exists. The authority does not.**
