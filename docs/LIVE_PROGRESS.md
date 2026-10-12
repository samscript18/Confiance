# Live setup progress

Verified 2026-10-12. No autonomous payment is claimed.

## Current status (supersedes earlier attempts below)

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
