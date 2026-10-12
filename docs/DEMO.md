# Demo verification procedure

## Three-minute presentation

This demo has two real completed rehearsals. Use their recorded receipts when
reviewing the existing proof; use a new actual PR for a fresh autonomous payment.
Do not replay a paid milestone or imply historical receipts are new transactions.

## Which receipts to present

[DEPLOYMENTS.md](DEPLOYMENTS.md) is the canonical receipt index. Use these exact
references consistently with [JUDGE_GUIDE.md](JUDGE_GUIDE.md) and
[VALIDATION.md](VALIDATION.md):

| Evidence                                                               | Block        | Receipt                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest hosted autonomous payment: Render, Gemini, Privy, PR #2, 30 CTT | **70465941** | [Payment](https://testnet.monadexplorer.com/tx/0x6eaecc46d20f3513452cb4e0bf6e591c10a3f38285d3cdec9276260e8f46870c), [machine-readable proof](research/hosted-payment.json) |
| CRE verification for that hosted PR #2 payment                         | **70465820** | [Authorized report](https://testnet.monadexplorer.com/tx/0x237d5539133dc31be0c9278de41be2c0c883e8d480c0f506c04347dc867036ff)                                               |
| Earlier PR #1 autonomous payment rehearsal, 30 CTT                     | **70422755** | [Earlier payment](https://testnet.monadexplorer.com/tx/0xa9d80f0c7087fe812b527737a440ce63e6801b6acb95e313126ab8ac3a03a5fe)                                                 |

Both completed payments used original account
`0x952bbdDeCE639f678733F310890d15E28b213489`. The negative-control receipts
come from the earlier PR #1 rehearsal. Present them as separate security proof,
not as later actions in the hosted PR #2 payment's timeline.

The new live-domain account `0xde4dfd84ed78c4c65d7670e22be1e002403f057f`
was deployed at block **70494094**. Hosted services are connected, but its
funding, owner policy approval and first autonomous payment must be
verified before claiming this account has completed the demo.

## Presentation screens

| Time      | Screen / action                                        | What the audience learns                                                        |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 0:00–0:30 | Public landing, then owner sign-in on the live website | The human controls authority; signed-out workspaces hide financial details      |
| 0:30–1:00 | Overview and Agent permissions                         | Separate owner/agent; 50 CTT total cap, asset, contractor, expiry and milestone |
| 1:00–1:30 | Open PR waiting result, then CRE receipt               | Real AI waits; an external authorized report unlocks the exact condition        |
| 1:30–2:00 | Successful 30 CTT receipt and Activity                 | Agent signs payment without a human popup; 30 spent, 20 remaining               |
| 2:00–2:30 | 500 CTT diagnostic receipt                             | The same signer cannot exceed its financial authority                           |
| 2:30–3:00 | Revocation and same-key retry receipts                 | The key still exists. The authority does not.                                   |

Use [DEPLOYMENTS.md](DEPLOYMENTS.md) for exact hashes and checked events. The
negative controls are explicitly labeled diagnostics, not fabricated AI intent.
Keep Cleanverse's limitation visible: this rehearsal uses CTT and exact-recipient
authorization, without an A-Pass compliance claim.

## Repeat the autonomous hosted flow without editing configuration

1. Sign in on the live website using its live-domain Mera passkey. Complete the
   new account's funding, session and CRE reporter setup first. The original
   localhost console remains available for its separate historical account;
   the live website no longer redirects owner actions there.
2. Create a real GitHub PR and keep it open. In Agent, choose its repo/number,
   actual token, contractor, 30-token payment and 50-token total budget.
3. Approve the onchain policy once. Save the receipt-bound task and start monitoring.
4. Confirm the agent observes the open PR and does not claim payment.
5. Merge that real PR. CRE discovers the task from the public feed, independently
   verifies the merge and reports through the owner-approved forwarder/workflow.
6. Wait for the Render worker. Inspect the actual agent-signed payment receipt,
   balances and spending; no owner payment approval is part of this step.
7. Observe completed-task detection and monitoring pause. Use the same agent's
   boundary diagnostics; owner revocation removes actual onchain permission.

The worker depends on server credentials configured once by the operator. Task
details are saved in MongoDB through the app. Free Render can sleep, so this
preview does not promise a strict verification/payment deadline. See [HOSTING.md](HOSTING.md).

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

## Live demo procedure

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
as `npm run agent:diagnostic -- <amount> --submit`; its controls are on `/app/agent#test-permissions`; verified Monad payment, CRE and limit
proofs are recorded in DEPLOYMENTS.md. Agent attempts never obtain an owner signature.

Use a genuine Cleanverse A-Token/A-Pass path only after its support is proven.
Otherwise label the real test ERC-20 fallback without claiming compliance or
USD value, and explicitly report the missing Cleanverse failure demonstration.

## Transaction proof checklist

For each important action save chain ID, transaction hash, receipt status,
block number, sender, recipient, asset/raw amount/decimals and explorer link.
Execution success requires a matching event from Confiance. Failed receipts
have no surviving events. Keep simulation reasons separate from receipt proof.
No indexed event may be manufactured for a reverted transaction.

The agent has autonomously paid 30 CTT on Monad and the 500 CTT limit diagnostic
has reverted. The same-key retry after owner revocation and replay attempt also reverted.
The remaining compliance scene needs a legitimate Cleanverse compliant payment. Do not delete the paid task receipt
or run the same milestone again as a new task to manufacture another payment.

**The key still exists. The authority does not.**

**Confiance — Give an AI agent a job without giving it your wallet.**

## Dashboard and autonomous worker

Open the landing page and choose Open app. Use `/app/account` for Mera and
funding, `/app/agent` for the Privy wallet and ERC-8004 identity, and `/app/agent#permissions`
for owner-authorized spending rules. `/app/overview#milestone` shows onchain verification;
`/app/activity` shows real events.
Authorize the actual CRE forwarder/workflow identity in Settings. Start
monitoring through the Agent page before merging the PR. The Render worker retries without owner
payment signing and stops once the verified task receipt is recovered.

The Overview page reads authority from Monad, history from Envio (or a bounded
recent RPC log view), and rejection receipts separately. Run Payroll Agent calls
the same LLM service. Test the boundaries uses the fixed Privy diagnostics.
Configure DIAGNOSTIC_RECIPIENT for the wrong-address test. This test proves the
owner-pinned recipient restriction, **not** A-Pass enforcement; the latter remains
pending Cleanverse support and a real compliant asset transfer.
