# Live setup progress

Verified 2026-10-12. No payment or project deployment is claimed.

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
