# Demo verification procedure

## Proven local core

```sh
npm ci
npm run contracts:build
npm run contracts:test
npm run abi
npm run test:local
```

The smoke script deploys on its own local Anvil chain, creates fresh separate
signers, funds Confiance with CTT, registers a local test identity and creates a
50 CTT total session. It checks:

1. Agent-signed 30 CTT settles; recipient balance and matching event are verified.
2. 500 CTT simulation identifies `SESSION_SPENDING_LIMIT`; submitted transaction reverts.
3. Reused request nonce identifies `INVALID_NONCE`; submitted transaction reverts.
4. Owner revokes the session.
5. The same agent signer submits 30 CTT and receives a reverted receipt.
6. Failed receipts contain no logs; recipient balance remains unchanged.

This proves the local authorization firewall. It does not prove Monad,
LLM/Privy/Mera, CRE, Cleanverse or ERC-8004 integration.

## Required live demo — pending

Do not present these steps as completed until their evidence is recorded.
Follow SETUP.md and INTEGRATIONS.md first.

| Scene | Action                                                                                   | Required evidence                                                                             |
| ----- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | Human authenticates with Mera; deploys/funds Confiance                                   | Owner address, real deployment/funding receipts, chain 10143                                  |
| 2     | Separate Privy wallet; Payroll Agent ERC-8004 identity                                   | Agent address distinct from owner, identity registration receipt                              |
| 3     | Owner authorizes 50 total token units / 24h / approved asset and recipient / Milestone 3 | Owner-signed session receipt and current onchain policy                                       |
| 4     | Actual configured PR is OPEN; agent waits; diagnostic payment attempt is blocked         | GitHub state, `CONDITION_NOT_VERIFIED` simulation; failed receipt if actually submitted       |
| 5     | Merge real PR; CRE verifies GitHub and writes its authorized report                      | Workflow execution evidence, verified forwarder/identity, ConditionVerified receipt           |
| 6     | Run payroll LLM; it autonomously requests 30 units through Privy                         | Agent sender, matching PaymentExecuted receipt, contractor balance change, no owner signature |
| 7     | Same agent signer deliberately attempts 500 units                                        | Onchain reverted receipt; diagnostic spending-limit reason; unchanged balances                |
| 8     | Attempt an ineligible recipient via a real supported compliance adapter                  | Real eligibility evidence, reverted receipt, unchanged balances                               |
| 9     | Owner revokes; same Privy agent retries                                                  | Owner revocation receipt, agent reverted receipt, SESSION_REVOKED diagnostic                  |

A responsible payroll LLM should wait when the milestone is incomplete. The
negative-attempt demo is an explicitly labeled deterministic diagnostic through
the same agent signer, not a fabricated AI decision. CLI tooling is available
as `npm run agent:diagnostic -- <amount> --submit`; its dashboard controls are implemented; real Monad proofs remain pending. Agent attempts never obtain an owner signature.

Use a genuine Cleanverse A-Token/A-Pass path only after its support is proven.
Otherwise label the real test ERC-20 fallback without claiming compliance or
USD value, and explicitly report the missing Cleanverse failure demonstration.

## Transaction proof checklist

For each important action save chain ID, transaction hash, receipt status,
block number, sender, recipient, asset/raw amount/decimals and explorer link.
Execution success requires a matching event from Confiance. Failed receipts
have no surviving events. Keep simulation reasons separate from receipt proof.
No indexed event may be manufactured for a reverted transaction.

The final live demo remains blocked on account provisioning, testnet funds and
CRE access and the unconfirmed Cleanverse compliance path. The central thesis has not yet been proven on Monad.

**The key still exists. The authority does not.**

**Confiance — Give an AI agent a job without giving it your wallet.**

## Dashboard and autonomous worker

Use Account & policy to create/sign in with Mera, deploy/fund Confiance, connect
the Privy wallet, register its ERC-8004 identity and authorize the session.
Authorize the actual CRE forwarder/workflow identity in Connections. Start
`npm run agent:watch` before merging the PR. The worker retries without owner
payment signing and stops once the verified task receipt is recovered.

The Overview page reads authority from Monad, history from Envio (or a bounded
recent RPC log view), and rejection receipts separately. Run Payroll Agent calls
the same LLM service. Test the boundaries uses the fixed Privy diagnostics.
Configure DIAGNOSTIC_RECIPIENT for the wrong-address test. This test proves the
owner-pinned recipient restriction, **not** A-Pass enforcement; the latter remains
pending Cleanverse support and a real compliant asset transfer.
