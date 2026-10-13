# Live setup progress

## Current status — 2026-10-13

This update supersedes the dated historical entries below. Owner controls now
use the live-domain Mera passkey. Confiance is registered with Cleanverse, both
addresses have CVIs, and the read-only adapter is deployed. The real Gemini
agent [paid 0.05 aUSDC](https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc) at block **70692069** through its separate
Privy signer. No owner payment signature was used. Envio indexes the receipt.
The same signer [failed a 500 aUSDC attack](https://testnet.monadexplorer.com/tx/0x7c7034399816faeee275945a19b538a366722a79bc392d5afcbb8792305a1353) at block **70693302**.
Treasury and contractor each hold 0.05 aUSDC; session spent is 0.05 of 0.1.

CVI-negative checks are simulation-only; the fresh live rejection remains outstanding. The larger faucet balance and separate
5 USDC deposit conversion remain operational limitations.

## Historical progress log

Verified 2026-10-12. A real autonomous Monad payment is now confirmed.

## Current status

- Frontend deployed at https://confiance-eta.vercel.app. Render backend deployed
  at https://confiance-backend.onrender.com on the user-selected free preview plan.
  Public pages, health, task feed and real account-state relay returned HTTP 200.
  Public state shows 970 CTT, the real agent and current generation 5 session.
- MongoDB is connected. Thirteen existing records were migrated without replacing
  records. Live database tests prove CRUD, concurrent unique intents and shared
  leases. Paid PR #1 is recognized as already paid, preventing another submission.
- The owner saved the PR #2 task and enabled monitoring entirely in the app.
  Render's Gemini worker observed the open PR and correctly withheld payment.
  After the actual merge, it independently paid 30 CTT in transaction
  `0x6eaecc46d20f3513452cb4e0bf6e591c10a3f38285d3cdec9276260e8f46870c`,
  block 70465941. The temporary local worker was stopped before the merge.
  Sender, target, event and balances were checked: generation 5 spent 30 CTT,
  remaining 20 CTT; contractor total balance 60 CTT across the two rehearsals.
  The cloud worker recognized the paid task and paused further monitoring.
- CRE task-discovery workflow is Active with ID ending `43b9ca`. Real simulation
  fetched the public feed and returned `no_task`. The owner approved its reporter.
  Task-fed PR #2 delivery is proved by matching onchain event in transaction
  `0x237d5539133dc31be0c9278de41be2c0c883e8d480c0f506c04347dc867036ff`,
  block 70465820. Previous PR #1 delivery remains proven.
- Local owner controls are at http://localhost:3050. The user explicitly chose
  to retain this owner for the preview. The public app links to the local owner
  console. Owner authentication on the Vercel hostname is not claimed.
- Envio Cloud indexes both verified 30 CTT payments using Monad testnet HyperSync.
  Public endpoint: `https://indexer.dev.hyperindex.xyz/bce44db/v1/graphql`.
  Matching hashes, blocks, chain, sender, token and account were checked.
  Public-RPC backfill hit rate limits and was replaced by supported HyperSync.
  Vercel Git auto-deployment still needs a GitHub Login Connection.
- Latest verification: **59 Solidity**, **39 unit**, **14 Playwright** tests pass,
  plus live MongoDB and split-server authentication/restart tests. Strict types,
  formatting lint, production builds and actual CRE WASM simulation pass.

## Completed core payment rehearsal

- CRE delivered the merged PR #1 report on Monad at block **70418309**.
  The workflow write had failed because 200,000 gas was below its 200,500
  minimum. The deployed replacement uses 500,000 gas; the owner approved its
  new workflow identity. Receipt and Confiance event are verified.
- The owner corrected a separate session milestone mismatch. Generation **3**
  now authorizes the exact condition independently verified by CRE.
- Vertex Gemini independently requested **30 CTT** through Privy. The real
  [payment](https://testnet.monadexplorer.com/tx/0xa9d80f0c7087fe812b527737a440ce63e6801b6acb95e313126ab8ac3a03a5fe)
  succeeded at block **70422755** without an owner payment signature. Sender,
  target, event, contractor balance and onchain spending were checked.
  Budget: **50 CTT**, spent: **30**, remaining: **20**.
- The same Privy signer attempted 500 CTT. Its
  [transaction](https://testnet.monadexplorer.com/tx/0x3fedaa78f306389c35712b3b1af3784d8679ba4e5c4c1e1155f9b23731ad82d8)
  reverted at block **70423405**; simulation identified the spending limit.
- Direct GitHub inspection was rate-limited. The model reported that honestly;
  matching CRE-verified onchain evidence established milestone completion.
- Public landing page is `/`; the app has separate Overview, Account, Agent, Activity and Settings routes under `/app`.
  Permissions and collapsed diagnostics live under Agent; milestone status is
  on Overview. Old section URLs redirect to their new locations.
  Its persistent layout preserves the in-memory owner session between app pages.
- Owner revoked the session at block **70424861**. The same Privy agent's
  30 CTT retry reverted at block **70425005**; simulation identified
  `SESSION_REVOKED`. Contractor balance and onchain spending stayed at 30 CTT.
  That generation was revoked; the owner subsequently renewed permission.
- Core Monad execution, limit, replay and same-key revocation proofs are complete.
  Cleanverse still requires legitimate enrollment/issuance and compliant-transfer
  proof; the full compliance requirement is not complete.
- Core receipts below are preserved independently of the subsequent hosting rollout.

See [DEPLOYMENTS.md](DEPLOYMENTS.md) for exact live receipts.

## Historical status (superseded by the current status above)

Latest milestone-blocking proof:

- Verified [agent transaction](https://testnet.monadexplorer.com/tx/0x5c60648fe19780c2fef291a1364116eaf0842e7ebab2c7eef8ca8c7887b001d9)
  reverted on chain 10143 at block **70411140**. Sender is the Privy agent,
  target is the deployed Confiance account, and decoded `executePayment` requests
  **30 CTT**, nonce 0, generation **2**, with the newly funded token
  `0xaBC746C3C77C73160ACEB419349C6980De4567BE` and the approved contractor.
  The supplied CLI diagnostic records pre-submission `CONDITION_NOT_VERIFIED`.
  Receipt status and exact calldata were independently checked; the reason comes
  from the diagnostic simulation. This is not an autonomous LLM payment proof.
- This supersedes the earlier generation-1 token mismatch below. The remaining
  payment demonstration needs merged-PR CRE delivery, then a confirmed LLM-requested
  payment, spending-limit rejection, and revoked-key rejection.
- Dashboard actions have individual loading labels and spinners. Confirmation
  dialogs describe the specific action and next step without environment variable
  names or CLI commands. Agent-result feedback distinguishes verified settlement,
  pending submission, previously paid tasks, and blocked requests. Model prose
  cannot produce a successful-payment modal.
- Current validation: **29 unit tests**, strict typechecks, lint, and production
  build pass. The new UI changes have not had interactive browser verification.

Latest checks at 12:33 UTC:

- Owner registered the agent in [this transaction](https://testnet.monadexplorer.com/tx/0x0e3083f5b11cfc265a8a74c8d257453813925a8f9a463ac836208ee95dd83990)
  and created its [50-token session](https://testnet.monadexplorer.com/tx/0x2e903a7d82b31685d98199a6c70fdf0902018e96457243ea9ec2a7e4299e60d7).
  Envio returns both actual events. The active session allows asset
  `0x6dd95642C4AC91D0b5849DCF2Ad0201878E06FEF`, whose treasury balance is zero.
- Local PAYMENT_ASSET now points to `0xaBC746C3C77C73160ACEB419349C6980De4567BE`.
  Its Confiance balance is 1,000 six-decimal units, but the existing session
  does not authorize that asset. No configuration was silently changed to bypass this.
- A real Privy diagnostic [reverted on Monad](https://testnet.monadexplorer.com/tx/0x63dc5e7bc2ecfe888d41c6b757b8c98aff265a5e4d7ff26e8139c28286db824c)
  at block 70398714. Pre-submission simulation returned ASSET_NOT_ALLOWED.
  This is asset-restriction evidence, not milestone rejection or autonomous payment proof.
- CRE reporter remains zero/unconfigured onchain. The dashboard now prefills its
  three public settings from configuration and validates each field separately.
  The human must still approve its actual owner-only authorization transaction.
- Cleanverse invitation and sandbox read access work. The official validator exists
  on Monad; Confiance is unregistered. See [CLEANVERSE.md](CLEANVERSE.md).
  The adapter is isolated and undeployed; its ten tests do not prove live compliance.
- Current checks: 59 Solidity tests (including 512 fuzz runs), 19 TypeScript tests,
  and four existing browser tests pass. Strict typechecks and production build pass.

The earlier setup evidence below remains historical where it describes absent sessions
or an empty indexer timeline.

- Confiance deployed and receipt/bytecode/owner verified on Monad testnet:
  `0x952bbdDeCE639f678733F310890d15E28b213489`, block **70364758**.
  [Deployment transaction](https://testnet.monadexplorer.com/tx/0x4c36aab404ca0b2e3b887096127e9e7a63ce66cdbfa84cec8623d4c4bbf55179).
- Privy paid deployment gas; immutable ownership remains the configured human
  `0x33fD00741137E0c7EA5cbAF143DAE846AedbcDF5`. Deployment grants no agent session.
  Owner passkey authentication and policy signatures remain required.
- ERC-8004 identity **2210** minted by the actual Privy agent at block **70362555**.
  [Mint transaction](https://testnet.monadexplorer.com/tx/0x20ce4773903a37466857b395e5c1d902e57c391a47066e647b15279bb1ac7d0d).
  Original receipt reconciled; sender, calldata, event, ownership and wallet binding verified.
  A case-sensitive address comparison had prevented local recording. It is fixed;
  existing identities require receipt reconciliation before another mint attempt.
- Agent received 10 MON before these operations; gas funding is no longer blocked.
- Vertex selected: `verith-ai`, `global`, `gemini-3.8-flash`. Configured service-account
  JSON now authenticates successfully. A real agent run called GitHub, policy,
  session, recipient and balance tools, then declined payment: PR #1 is open,
  session absent, recipient not authorized and treasury empty. See [VERTEX.md](VERTEX.md).
  There is no Mistral fallback when Vertex is selected.
- Envio schema migrated, Activity GraphQL query works, and RPC-only indexing finished
  backfill through block **70366351** and reported ready. No Confiance activity
  events exist yet because no session/report/payment was submitted.
- CRE workflow is deployed to the verified private registry and **Active**:
  ID `0x00b8e771656a028fd582a33fee292cac1a4eaca7fd47d84672c99d28631dac74`,
  owner `0x1db255D03A90f194483fEc22A9a32965e98a521E`. Actual CLI deployment metadata
  is in [research/cre-deployment.json](research/cre-deployment.json) and local `.env`.
  Owner reporter authorization and real onchain delivery remain pending.
- The corrected workflow now succeeds on the DON. Execution
  `50b09c3568dd19be345a1a85d1dbbe994525c87ce2612983f636960cc4099b11` succeeded;
  logs from all ten nodes state `GitHub PR state: open; no condition report generated.`
  This is actual offchain verification; no onchain report receipt exists yet.
- Configured treasury CTT balance is **0**. Owner funding, registration, session
  creation and reporter authorization remain outstanding.
- Cleanverse docs require an invitation code. The supplied list lacks the actual
  Google Drive URLs. Sandbox discovery returns **0002**, `Internal server error`,
  for GET and documented POST. No API key was committed or guessed into undocumented
  headers. Smart-account enrollment, ABI and compliant-transfer proof remain unresolved.
- Updated code: **17 unit tests**, strict typing and production build pass.

## Earlier setup attempts

## Completed operations

- Created the actual Ethereum Payroll Agent wallet through the configured Privy app.
- Verified the agent differs from the configured owner; saved its public ID/address
  in ignored `deployments/agent-wallet.json` and local `.env`.
- Agent address: `0x9A62195Bb2C8eCeAaF306EC7Ee87f7e4994Ba11D`.
- Published real registration metadata with `active: false` to
  https://raw.githubusercontent.com/samscript18/Confiance/dev/docs/agent-registration.json
  and verified its public retrieval and agent-wallet binding. Configured
  `ERC8004_AGENT_URI`. No identity has been minted yet.
- CRE authentication now succeeds and the account reports deployment access enabled.
- Authenticated tenant directory includes `monad-testnet`, selector
  `2183018362218727504`, address `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`.
  Its deployed code was verified on chain 10143. This is the directory's `address`,
  not its `mockAddress`. Production delivery remains to be proven.

## Attempted operations and exact blockers

| Operation                             | Result / blocker                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent gas balance                     | 0 MON; identity mint and agent transactions cannot proceed                                                                                       |
| Official faucet connectivity          | https://faucet.monad.xyz returned HTTP 429; no faucet claim was made                                                                             |
| Real LLM readiness call               | Mistral returned HTTP 429, `Rate limit exceeded`; no successful reasoning run or payment claimed                                                 |
| Confiance deployment and policy setup | Owner address is public configuration; no owner signing session is available to the CLI. Mera passkey approval must occur in the human's browser |
| CRE receiver/workflow setup           | Actual Confiance receiver not deployed; workflow ID/owner and production delivery are not established                                            |
| Envio history                         | Database services are prepared, but migration/indexing require actual deployment-derived configuration                                           |
| Cleanverse                            | User chose the exact-recipient test ERC-20 fallback after business enrollment requirements; no A-Pass compliance claim                           |

## Next operations

Fund the separate agent with testnet MON and complete Mera owner deployment in the
dashboard. The engineer can then record deployment, mint the identity, derive real
workflow/indexer configuration and continue live verification. Owner policy/reporter
authorization must still be signed with the human's passkey.

Use [SETUP.md](SETUP.md) for the full sequence. Preserve durable deployment and
payment proof files. The same agent wallet must be used for the revocation test.

## Same agent key after aUSDC session revocation

The owner [revoked the current session](https://testnet.monadexplorer.com/tx/0x987ca54849ec33ef85602e1ac056695dd27b52ee2a56b4b2a90ea5a23f28255c) at block **70693560**.
The same Privy agent then [retried 30 aUSDC](https://testnet.monadexplorer.com/tx/0xd10888163b2e1e0f7e23f79a505de45613722b0cb60c09940a0c0456b7ece274) at block **70693748**:
the transaction reverted. Pre-submission simulation returned `SESSION_REVOKED`.
The mined receipt and sender/target/calldata were checked. Session generation 5
is inactive; spent and treasury balance remain **0.05 aUSDC**. No human signed
the retry. [Paired receipt audit](research/cleanverse-revoked-rejection.json).

**The key still exists. The authority does not.**
