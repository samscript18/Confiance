# Confiance: evaluator guide

> Give an AI agent a job without giving it your wallet.

Confiance is a working onchain execution firewall on Monad testnet. A human gives
a separate AI agent a bounded session; the agent decides when to request payment;
the contract checks whether that request is authorized. The human signs setup and
revocation, not routine agent payments.

## Review the strongest current proof in 30 seconds

1. A human signs in with Mera on the live app and approves a **0.1 aUSDC**
   session: exact asset and contractor, 24-hour expiry, PR #3 milestone and the
   deployed Cleanverse compliance adapter.
2. Chainlink CRE has independently verified the actual PR merge onchain.
3. The real Vertex Gemini agent invokes milestone, policy, session, recipient
   and balance tools, then requests **0.05 aUSDC**.
4. Its separate Privy wallet signs the payment. The human signs no payment.
5. Confiance validates permission and the adapter checks both CVIs. The aUSDC
   contract enforces its transfer policy and transfers the tokens.
6. The receipt contains matching `PaymentExecuted` and aUSDC `Transfer` events.
   Envio indexes both Confiance payment events at the same block.

[**Verify the actual aUSDC payment — block 70692069**](https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc).
[Machine-readable audit](research/cleanverse-payment.json) includes exact addresses,
raw event amounts, session generation, signer, runtime tools and indexing checks.

This run used the real runtime from the engineering workstation with hosted
configuration and shared MongoDB coordination. The earlier 30 CTT rehearsal
proved unattended execution on Render. They are separate receipts and claims.

**The key still exists. The authority does not.** The earlier CTT security
rehearsal below independently proves over-limit, replay and same-key revocation.
A fresh live CVI-ineligible rejection remains to be demonstrated; current CVI
negative evidence is a real contract read and reverted simulation.

Public app: [Confiance preview](https://confiance-eta.vercel.app).
Owner controls run on this domain. The workspace requires owner sign-in;
evaluators can inspect public receipts and evidence without credentials.

## What is technically distinctive

The agent's signer and financial permission are separate. Possessing a signer
does not let an agent choose a recipient, asset, spending cap, expiry or verified
condition. `executePayment` checks all of them onchain. Revocation removes the
permission while leaving the signer intact. An LLM, backend, frontend or indexer
cannot override those rules.

The runtime exposes six deterministic tools without arbitrary calldata inputs.
CRE is the milestone reporting authority. Envio supplies history, not permission.
MongoDB stores tasks and recovery receipts, not the treasury authorization state.
The MVP avoids bundlers and ERC-4337 infrastructure because direct agent EOA
transactions already prove the intended boundary.

## Latest end-to-end proof index

| Action                | Asset and amount           | Block    | Independent result                                                        |
| --------------------- | -------------------------- | -------- | ------------------------------------------------------------------------- |
| Real Gemini payment   | 0.05 aUSDC                 | 70692069 | Privy sender; exact Confiance execution and token transfer; Envio indexed |
| Over-limit diagnostic | 500 aUSDC                  | 70693302 | Reverted; spending-limit failure observed before submission               |
| Owner revocation      | aUSDC session generation 5 | 70693560 | Owner sender; SessionRevoked indexed; session inactive                    |
| Same-key retry        | 30 aUSDC                   | 70693748 | Same Privy sender; reverted; spent and balance unchanged                  |

The payment is the autonomous LLM proof. The attacks are deterministic security
proofs. Their different roles are intentional; model prose never proves settlement.
Exact receipt links and machine-readable audits appear below and in
[DEPLOYMENTS.md](DEPLOYMENTS.md).

## Independently verifiable blockchain evidence

The strongest current settlement proof is the live-domain Cleanverse payment:
[0.05 aUSDC, block 70692069](https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc). Its `PaymentExecuted` and token
`Transfer` events agree on account, contractor and 50,000 raw units. Envio
indexes `PaymentRequested` and `PaymentExecuted` at that same block.

The same agent's [500 aUSDC attack, block 70693302](https://testnet.monadexplorer.com/tx/0x7c7034399816faeee275945a19b538a366722a79bc392d5afcbb8792305a1353) reverted.
Pre-submission simulation identified `SESSION_SPENDING_LIMIT`; the mined receipt
independently proves failure. This is a deterministic security diagnostic, not an
LLM payment. [Machine-readable rejection](research/cleanverse-limit-rejection.json).

| Claim                      | Evidence                                                                                                                                | What to check                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Autonomous hosted payment  | [30 CTT, block 70465941](https://testnet.monadexplorer.com/tx/0x6eaecc46d20f3513452cb4e0bf6e591c10a3f38285d3cdec9276260e8f46870c)       | Agent sender, Confiance target, token transfer and PaymentExecuted |
| Real external verification | [PR #2 report, block 70465820](https://testnet.monadexplorer.com/tx/0x237d5539133dc31be0c9278de41be2c0c883e8d480c0f506c04347dc867036ff) | Authorized forwarder and matching ConditionVerified event          |
| Spending limit             | [500 CTT attempt](https://testnet.monadexplorer.com/tx/0x3fedaa78f306389c35712b3b1af3784d8679ba4e5c4c1e1155f9b23731ad82d8)              | Reverted receipt; pre-submission simulation identified the limit   |
| Replay protection          | [Reused nonce](https://testnet.monadexplorer.com/tx/0x480fd9af55d58c6ad0fa83e139c49794c9f9ec55b3d56d38ae6a66e27eda30d8)                 | Reverted receipt; nonce reason recorded separately                 |
| Owner revocation           | [Owner transaction](https://testnet.monadexplorer.com/tx/0x7a69cbdbf6ccfd9bbcb13cab63bf22d2fad99f80e2829f338876fd42ba151237)            | Owner sender and SessionRevoked                                    |
| Same key loses authority   | [Agent retry](https://testnet.monadexplorer.com/tx/0x24fe8cb25754b00cf5db257e443bd1d0c34eb85b4b4c0beb04ad2104913b4fa6)                  | Same agent sender, reverted receipt and unchanged spending         |

Reverted transactions have no retained events. Failure labels come from checked
receipts plus explicitly identified diagnostic simulations, not invented logs.
The negative controls are deterministic security tests through the same Privy
signer; they are not presented as spontaneous LLM decisions.

The earlier unattended Render payment is block **70465941**, documented in
[hosted-payment.json](research/hosted-payment.json). Block **70422755** is the
earlier PR #1 payment rehearsal. The negative controls in the table belong to
that earlier rehearsal; they are not subsequent transactions from the PR #2
session. [DEPLOYMENTS.md](DEPLOYMENTS.md) is the canonical receipt index.
Both payment rehearsals used `0x952bbdDeCE639f678733F310890d15E28b213489`.
The live-domain account `0xde4dfd84ed78c4c65d7670e22be1e002403f057f` was deployed at block **70494094** and has the independently verified aUSDC payment at block **70692069**.

## Sponsor integration responsibilities

| Integration   | Real responsibility                               | Verified status                                                                                                       |
| ------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Monad         | Onchain authorization and ERC-20 settlement       | Deployment and successful/reverted receipts                                                                           |
| Mera          | Human passkey-derived owner signer                | Original owner ceremonies plus live-domain owner deployment; compliant session and autonomous aUSDC payment confirmed |
| Privy         | Separate agent signer                             | Real agent wallet and submitted payments                                                                              |
| ERC-8004      | Agent identity                                    | Identity 2210, registry wallet binding                                                                                |
| Chainlink CRE | Independently verify GitHub and report to account | Two real onchain milestone reports                                                                                    |
| Envio         | Index actual activity                             | Hosted HyperSync history matched to both payments                                                                     |
| Vertex Gemini | Decide whether to request payroll                 | Real tool-using local and Render runs                                                                                 |
| Cleanverse    | Intended compliant token/recipient path           | Real registration, both CVIs, deployed adapter and autonomous aUSDC payment verified                                  |

## Technical review map

- [Contracts](../contracts/src/Confiance.sol): authorization, accounting and reports.
- [Contract tests](../contracts/test/Confiance.t.sol): adversarial authorization cases.
- [Agent runtime](../agent/runtime/service.ts): orchestration and recovery.
- [Payment tool](../agent/tools/payroll.ts): fixed request, simulation and receipt checks.
- [CRE workflow](../cre/workflows/milestone/workflow.ts): task discovery and actual merge evidence.
- [Indexer](../indexer/src/handlers/activity.ts): actual event projections.
- [Architecture](ARCHITECTURE.md), [security](SECURITY.md), [validation](VALIDATION.md).
- [Exact deployments](DEPLOYMENTS.md) and [machine-readable proof](research/hosted-payment.json).
- [Reproducible demo](DEMO.md) and [hosting procedure](HOSTING.md).

## Honest completion boundary

The central autonomous-payment thesis and Cleanverse settlement now have real
testnet proof. Current Cleanverse funding is small: the faucet supplied 0.1 aUSDC,
and the agent paid 0.05. No real-world KYC investigation is claimed for sandbox
CVIs; issuance omitted optional identity documents and bank details.

The actual CVI-negative rejection transaction remains unfinished. The original CTT revocation proof is valid evidence
of Confiance's authorization boundary, but is not described as an aUSDC test.

This is a single-owner testnet MVP, not an independently audited production wallet.
Free Render can sleep; free Envio development deployments have a 30-day lifetime.
The live domain uses its own passkey owner and a new account; the original
localhost account and its historical proofs remain preserved. Test
results and exact receipts support each claim; no judging score is asserted.

## Cleanverse payment update — 2026-10-13

The live-domain account has now paid **0.05 test aUSDC** through the real Gemini
agent and separate Privy signer, without an owner payment signature.
[Verified transaction](https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc),
block **70692069**. Registration, both CVIs, adapter deployment and funding are
verified. [Independent receipt/event audit](research/cleanverse-payment.json).
Current negative CVI evidence is simulation-only; a live rejection remains a separate unfinished check.

## Same agent key after aUSDC session revocation

The owner [revoked the current session](https://testnet.monadexplorer.com/tx/0x987ca54849ec33ef85602e1ac056695dd27b52ee2a56b4b2a90ea5a23f28255c) at block **70693560**.
The same Privy agent then [retried 30 aUSDC](https://testnet.monadexplorer.com/tx/0xd10888163b2e1e0f7e23f79a505de45613722b0cb60c09940a0c0456b7ece274) at block **70693748**:
the transaction reverted. Pre-submission simulation returned `SESSION_REVOKED`.
The mined receipt and sender/target/calldata were checked. Session generation 5
is inactive; spent and treasury balance remain **0.05 aUSDC**. No human signed
the retry. [Paired receipt audit](research/cleanverse-revoked-rejection.json).

**The key still exists. The authority does not.**

## Public illustrations and evidence boundaries

The landing cockpit and its interactive payment simulator are explicitly labeled
as illustrations. Acme, David, PR #42 and example activity are explanatory data;
clicking the simulator submits no transaction. Prominent payment and receipt-index
links point to actual Monad evidence. Successful execution and policy events are
indexed by Envio. Reverted transactions retain no logs; their history uses checked
failed receipts, with rejection reasons sourced separately from simulation.

The outstanding CVI-negative check requires a mined transaction against an
ineligible recipient under a policy that otherwise permits that address. A
wrong pinned recipient or revoked session does not prove Cleanverse rejection.
Current negative CVI evidence remains a real eligibility read and reverted transfer
simulation; no mined CVI rejection is claimed.
