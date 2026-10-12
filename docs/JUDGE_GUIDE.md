# Confiance: evaluator guide

> Give an AI agent a job without giving it your wallet.

Confiance is a working onchain execution firewall on Monad testnet. A human gives
a separate AI agent a bounded session; the agent decides when to request payment;
the contract checks whether that request is authorized. The human signs setup and
revocation, not routine agent payments.

## Review the product in 30 seconds

1. The owner authorizes 50 CTT in total, a specific asset and recipient, a 24-hour
   session and a required GitHub milestone.
2. The real Gemini agent waits while the PR is open.
3. Chainlink CRE independently verifies the actual merge and reports onchain.
4. The Render worker requests 30 CTT through its own Privy signer. Monad settles.
5. A 500 CTT request reverts. After revocation, the same agent key also fails.

**The key still exists. The authority does not.**

Public app: [Confiance preview](https://confiance-eta.vercel.app).
The workspace requires owner sign-in. Evaluators do not need credentials to
inspect the public evidence below. The current preview intentionally retains
the existing owner console on localhost; hosted owner onboarding is deferred.

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

## Independently verifiable blockchain evidence

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

## Sponsor integration responsibilities

| Integration   | Real responsibility                               | Verified status                                               |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Monad         | Onchain authorization and ERC-20 settlement       | Deployment and successful/reverted receipts                   |
| Mera          | Human passkey-derived owner signer                | Local owner setup, policy and revocation ceremonies           |
| Privy         | Separate agent signer                             | Real agent wallet and submitted payments                      |
| ERC-8004      | Agent identity                                    | Identity 2210, registry wallet binding                        |
| Chainlink CRE | Independently verify GitHub and report to account | Two real onchain milestone reports                            |
| Envio         | Index actual activity                             | Hosted HyperSync history matched to both payments             |
| Vertex Gemini | Decide whether to request payroll                 | Real tool-using local and Render runs                         |
| Cleanverse    | Intended compliant token/recipient path           | Official adapter tested; live registration/settlement blocked |

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

The central autonomous-payment thesis has real testnet proof. Cleanverse is not
live: registration returns HTTP 403, and enrollment, legitimate CVI issuance and
a direct compliant transfer remain unproved. The demonstrated token is six-decimal
CTT, not USD, a stablecoin or a Cleanverse A-Token. No A-Pass enforcement is claimed.

This is a single-owner testnet MVP, not an independently audited production wallet.
Free Render can sleep; free Envio development deployments have a 30-day lifetime.
The localhost passkey is not assumed to recover on the Vercel hostname. Test
results and exact receipts support each claim; no judging score is asserted.
