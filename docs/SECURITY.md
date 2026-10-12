# Security model

## Compromised agent key

A compromised agent can only spend the remaining session allowance in the
configured asset to the pinned recipient before expiry and after any required
condition. It can attempt arbitrary calls, but owner-only mutations reject it.
Revocation is checked on every execution. Possession of the same key does not
restore permission. Revocation takes effect when the owner transaction settles;
a payment ordered before revocation may still execute.

## Agent hallucination and malicious milestone content

The LLM proposes actions. It cannot grant authority. Tools expose no privileged
calldata, policy overrides or mutable verification flags. GitHub text is not
included in the model context; only validated PR state is returned. Onchain
condition state must match the configured GitHub task. Model text alone cannot
prove settlement.

## Spending, replay and expiry

Limits use raw token units with exact decimal parsing. Spending is cumulative.
Owner policy edits preserve spent and cannot lower the cap beneath spent.
Changing asset requires a new session. Requests include a monotonic lifetime
nonce and a session/policy generation; obsolete requests do not survive renewal
or edits. Exact expiry (`block.timestamp >= expiry`) is rejected.

## Malicious token or compliance adapter

Checks precede effects and transfers. ReentrancyGuard protects settlement.
SafeERC20 rejects failed transfers; spending/nonce changes roll back. Exact
treasury debit and recipient credit are checked, rejecting fee/rebase behavior.
An unavailable or reverting adapter fails closed. Token/adapter code remains
trusted external infrastructure selected by the owner; a malicious contract can
lie in view functions. No generic checks can turn an unverified asset into a
trusted token. The Cleanverse adapter is not live.

## CRE reporting

Both forwarder and workflow identity must match. Reports bind chain and account.
Zero reporter configuration cannot enable open reporting. Neither owner nor
agent can call onReport directly. The owner must configure the authentic
production forwarder; simply putting code at an address does not prove it is
Chainlink. The owner could intentionally select a malicious reporter, which is
outside the honest-owner threat model. A compromised owner can change policy.

## Frontend and backend compromise

Critical authority remains onchain. A compromised UI cannot increase agent
authority without an owner-signed change. Mera-derived key material must be held
in memory, never backend configuration or browser persistent storage. A live
owner page can sign owner operations while its signing session exists, so XSS
protection remains necessary. The app renders provider/transcript text through escaped React text nodes and uses no external scripts or HTML injection. Security response headers are configured.

Privy app credentials and optional authorization keys are server-only. Runtime
errors are sanitized before entering LLM results or logs. HTTP signing operations require a verified owner signature session, strict origin checks and current ownership. Challenges are random, single-use, expire after five minutes and have a bounded pending set. Agent tools accept no caller-controlled transaction arguments. Security-demo endpoints accept only fixed operations and refuse submission unless the expected onchain rejection is observed.

## Operational limits

This contract is not independently audited. The owner cannot rotate or renounce
ownership in the current MVP. There is no owner treasury recovery/withdrawal
operation yet; funded tokens leave only through valid agent payments. Native
MON belongs in the owner/agent EOAs for gas; the smart account does not accept
native funding. Do not fund this experimental account with real assets.

A submitted transaction with an unavailable receipt remains unverified. Check
the chain before resubmission. A polling worker and durable single-host lock are implemented. Interrupted locks require receipt reconciliation before removal. There is no distributed job lock. The cumulative budget and nonce/generation limit key
authority but are not a general payroll invoice deduplication system. The runtime also records completed milestone tasks and revalidates exact receipts before avoiding duplicates. An agent calling the contract directly can still make distinct valid payments within its session budget; per-invoice onchain authorization is a future extension if payroll scope expands.

Envio is a read-side projection only. Rejection reasons derived from simulation
must be labeled diagnostic; the actual failed receipt proves only that execution
reverted. The same request should be replayed at the applicable transaction
state to determine the exact historical reason where RPC tracing is supported.

## Verification limitations

The Mera SDK signing and ended-session behavior are tested. Automated browser
checks validate owner challenge signatures, cookie flags and replay rejection,
using an explicitly unfunded test fixture. They do not prove a physical passkey
provider's PRF ceremony. Test the final browser/authenticator/domain with the human.

SDK declaration repairs are pinned, documented and runtime-neutral. They are
not compiler-error suppression. Re-review them when changing dependency versions.
The independently deployed Cleanverse asset, registry and Chainlink infrastructure
remain external trust dependencies requiring live integration proofs.

## Workspace privacy boundary

`GET /api/state` verifies the owner cookie and its expiry before loading workspace
records or returning financial details. Public visitors get only sign-in
bootstrap state. The UI also requires the current in-memory owner signing session;
expiry and sign-out hide the workspace and old transaction links immediately.
Mutations additionally enforce the configured origin. The Vercel proxy forwards
cookies with a server-only shared secret; that secret cannot grant owner authority.
Auth challenges are consumed atomically and session tokens are hashed in MongoDB.

This prevents accidental disclosure through the dashboard and its state endpoint.
It is not blockchain confidentiality: addresses, transfers, ERC-8004 metadata and
public Envio events can be observed directly onchain. CRE's public task-discovery
endpoint intentionally exposes the minimum milestone metadata it needs. Neither
that endpoint nor public indexer data can change authorization.

## Verified defenses and assurance limits

| Boundary          | Implementation                                         | Evidence                                               |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Owner-only policy | Immutable owner and owner-only mutations               | Foundry tests and owner-signed session receipts        |
| Bounded agent     | Asset, exact recipient, cumulative spending, expiry    | 30 CTT success and real 500 CTT revert                 |
| Revocation        | Session status checked per execution                   | Same Privy key rejected after owner revocation         |
| Replay            | Lifetime nonce and policy generation                   | Reused-nonce revert and unit/fuzz tests                |
| Milestone         | Authorized forwarder/workflow and domain-bound reports | Two real CRE ConditionVerified receipts                |
| Duplicate task    | Durable intents, Privy idempotency, shared Mongo lease | Concurrent database tests and worker already-paid stop |
| UI access         | Owner-authenticated state reads and sign-out lock      | Browser/API authentication regression suite            |
| Compliance        | Official adapter fails closed                          | Adapter tests only; live Cleanverse settlement blocked |

Tests and testnet receipts establish specific demonstrated properties; they do
not constitute an independent security audit or a guarantee against all attacks.
The owner remains a trusted authority. Operator compromise can use the agent's
remaining permission, but cannot enlarge it without the owner's signature.
