# Integration evidence and boundaries

Verified 12 October 2026. This page describes the running MVP, not SDK import
status. Exact receipts are in [DEPLOYMENTS.md](DEPLOYMENTS.md); reproducible
operations are in [HOSTING.md](HOSTING.md) and [SETUP.md](SETUP.md).

## Integration status

| Integration          | Responsibility                                               | Live evidence                                                                               | Boundary                                                                                 |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Monad testnet        | Authorization and settlement, chain 10143                    | Account deployment, two real 30 CTT payments, reverted limit/replay/revocation transactions | Testnet only; not independently audited                                                  |
| Mera 0.2.0           | Passkey-derived human owner signer                           | Human-approved policy, reporter and revocation transactions                                 | Existing localhost owner selected for preview; hosted passkey onboarding deferred        |
| Privy Node 0.35.0    | Separate agent wallet and transaction signing                | Agent `0x9A62195Bb2C8eCeAaF306EC7Ee87f7e4994Ba11D` submitted actual payments                | Server credentials required; Privy does not authorize treasury spending                  |
| Vertex Gemini        | Decide whether to request payroll through fixed tools        | Real waiting-state observation and Render-hosted autonomous payment                         | Offchain reasoning; no arbitrary transaction calldata tools                              |
| ERC-8004             | Agent identity and wallet binding                            | Identity 2210 in registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`                      | Identity metadata does not grant financial authority                                     |
| Chainlink CRE        | Independently verify actual GitHub merge and report onchain  | PR #1 and task-discovered PR #2 reports confirmed                                           | Owner-pinned forwarder and exact workflow identity; no backend verification switch       |
| Envio 3.14.0         | Index and display historical events                          | Hosted GraphQL matched both payment hashes and blocks                                       | History is read-side data, never authorization                                           |
| MongoDB 7.7.0 driver | Persist tasks, auth, intents, proofs and worker coordination | Real database CRUD, concurrent unique intents, leases and restart-safe login tests          | Onchain policy remains the final authority; database outage stops execution              |
| Cleanverse           | Intended compliance eligibility and A-Token settlement       | Official docs/validator inspected and adapter tested                                        | Live registration returns HTTP 403; enrollment, issuance and compliant transfer unproved |

## Proven autonomous payment path

```text
Owner Mera passkey → approve Confiance policy once
Render Gemini → deterministic tools → Privy agent signer
→ Confiance checks → CTT transfer on Monad testnet

GitHub PR merge → CRE independent verification
→ authorized forwarder report → Confiance ConditionVerified
```

The PR #2 payment is transaction
`0x6eaecc46d20f3513452cb4e0bf6e591c10a3f38285d3cdec9276260e8f46870c`,
block 70465941. The matching CRE report is
`0x237d5539133dc31be0c9278de41be2c0c883e8d480c0f506c04347dc867036ff`,
block 70465820. Receipt/event checks confirm actual execution, not model prose.
The temporary local worker was stopped before this hosted rehearsal's merge.

## CRE task discovery

Active workflow ID:
`0x000aa0784b0fb840ea903da674bf9964ec02a045037f7cb115ed4c2acd43b9ca`.
Forwarder: `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`.
The owner approved both the workflow and forwarder onchain.

CRE reads `https://confiance-backend.onrender.com/api/task`, checks task metadata
against the actual session and independently reads GitHub. Changing task metadata
cannot mark a condition verified. New owner-approved tasks can use this workflow
without another workflow deployment. Private GitHub PRs need a separately
configured CRE secret integration; a backend GitHub token alone is insufficient.

## Hosted history

GraphQL: `https://indexer.dev.hyperindex.xyz/bce44db/v1/graphql`.
Organisation/indexer: `samscript18/confiance`, deployment commit `3212e18`.
Public RPC backfill hit rate limits; the verified replacement uses Monad testnet
HyperSync. Both actual payments match indexed sender, asset, account, raw amount
and independently checked blocks. See [machine-readable evidence](research/envio-cloud.json).
Reverted transactions have no retained events; rejected attempts are displayed
from checked receipts and clearly identified diagnostic simulations.

## Cleanverse: setup and autonomous settlement verified

The API-key pairing was corrected and the owner-approved account registration
confirmed at block **70650040**. Using the permissions confirmed by Cleanverse,
the official Generate CVI API issued credentials for the live smart account and
contractor. Both now pass the validator. No identity documents or bank records
were invented; optional identity fields were omitted and the provider selected
the sandbox tier.

The real adapter was deployed at
`0xf2403571b7fe9849f8482ea566177eeee689df99`, block **70679868**. Its immutable
account, asset, validator and token-policy bindings were checked. A smaller
faucet request supplied **0.1 test aUSDC**, block **70681581**, and a direct
**0.05 aUSDC** transfer simulation passes. The larger funding request failed due
to faucet balance; a separate 5 USDC deposit remains unconverted and is not
counted as treasury aUSDC.

The owner interface can select the verified asset and adapter. The owner must
approve the new session; an existing CTT permission is not silently changed.
The autonomous 0.05 aUSDC payment is verified at block 70692069. A real
CVI-ineligible rejection transaction still needs proof. Existing CTT payments do not establish Cleanverse settlement.

See [setup receipts and exact remaining steps](CLEANVERSE_NEXT_STEPS.md).

## Operational and SDK limitations

- The user selected a localhost owner console for this preview. The public app
  links owner actions to port 3050. A passkey on another hostname is not assumed
  to recover the same immutable-owner account.
- Free Render can sleep. Free Envio development deployments have a maximum
  30-day lifetime. These preview choices do not provide production uptime.
- Vercel Git linking requires a GitHub Login Connection; the initial deployment
  used the official CLI's source upload. Render automatic deployments are disabled
  while release verification remains manual.
- Version-checked declaration repairs for Privy, CRE and Envio change type
  declarations only, not executable SDK code. Strict type checks remain enabled.
  Review and remove repairs when compatible upstream declarations are available.
- Signed-out workspace state is owner-gated; blockchain events, identity
  metadata, public proof documents and CRE verification metadata remain public.

The [historical inspection](research/historical-integration-inspection.md) records
prior blockers for traceability. Its superseded status statements do not describe
the current deployment.

## Cleanverse payment update — 2026-10-13

The live-domain account has now paid **0.05 test aUSDC** through the real Gemini
agent and separate Privy signer, without an owner payment signature.
[Verified transaction](https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc),
block **70692069**. Registration, both CVIs, adapter deployment and funding are
verified. [Independent receipt/event audit](research/cleanverse-payment.json).
Current negative CVI evidence is simulation-only; a live rejection and fresh
aUSDC revocation rehearsal remain separate unfinished checks.
