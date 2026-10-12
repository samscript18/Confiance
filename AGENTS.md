# AGENTS.md — Confiance

## 0. Mission

Build **Confiance**, an onchain execution firewall for autonomous AI agents on Monad.

### Core line

> **Give an AI agent a job without giving it your wallet.**

### Core principle

> **The agent gets the ability to act, not the authority to decide what it is allowed to do.**

Confiance must demonstrate a real autonomous agent making blockchain payments **without a human signing every payment**.

The human signs/approves the agent's policy/session during setup.

After that:

**AI Agent → Agent Wallet → Confiance → policy validation → payment**

The human must NOT be required to approve each payment.

The central technical proof is:

1. Human establishes the agent's authority.
2. Agent receives its own signer/wallet.
3. Agent requests a payment autonomously.
4. Confiance validates the request onchain.
5. Valid request executes.
6. Invalid request reverts.
7. Owner can revoke the agent.
8. The same agent key can no longer execute after revocation.

---

# 1. Non-Negotiable Requirements

These requirements override convenience.

## 1.1 Real blockchain execution

The final application must execute against **Monad testnet**.

Do not simulate successful transactions in the UI.

Do not fabricate transaction hashes.

Do not display fake balances.

Do not use mocked blockchain responses in the final demo path.

If an integration cannot be completed, clearly isolate it behind a feature boundary and document the limitation rather than pretending it works.

---

## 1.2 Autonomous agent execution

The agent must have its **own wallet/address**.

The agent must NOT use the human owner's private key.

The human must NOT sign each payment.

The intended architecture is:

```text
Human Owner
    │
    │ setup / authorize
    ▼
Confiance Smart Account
    │
    │ limited session authorization
    ▼
AI Agent
    │
    │ signs payment request
    ▼
Confiance
    │
    ├── policy checks
    ├── spending checks
    ├── recipient checks
    ├── asset checks
    └── external condition checks
    │
    ▼
Payment
```

---

## 1.3 Never claim Privy is the authorization layer

Privy provides the agent wallet/signing capability.

Privy does NOT determine the agent's financial authority.

Confiance determines authority.

Correct:

> Privy gives the agent a signer. Confiance gives that signer bounded authority.

Incorrect:

> Privy restricts the agent to $50.

---

## 1.4 Mera is owner authentication

Mera is used for the human owner/passkey flow.

Mera must NOT be used as the agent's key.

Architecture:

```text
Mera
  ↓
Owner EOA
  ↓
Confiance ownership
```

and separately:

```text
Privy / Agent wallet
  ↓
Agent EOA
  ↓
Confiance session
```

These are different authorities.

---

# 2. Product Definition

Confiance is a programmable authorization layer between autonomous AI agents and money.

A traditional architecture is:

```text
Human → Wallet → AI Agent
```

This gives the agent too much authority.

Confiance changes it to:

```text
Human → Confiance Smart Account ← Agent
```

The human controls the account.

The agent can request actions.

Confiance decides whether those actions are authorized.

---

# 3. Primary Demo Use Case

Build a **Payroll Agent**.

The agent is responsible for paying a contractor when a required milestone is verified.

Example:

```text
Company: Acme
Agent: Payroll Agent
Contractor: David
Payment: $30
Maximum session spending limit: $50
Condition: GitHub PR #42 must be merged
Asset: Cleanverse-compliant A-Token
Recipient: A-Pass eligible
Session duration: 24 hours
```

The agent should be capable of deciding:

> “The milestone is complete. I should pay David.”

The agent then requests the payment.

Confiance determines whether it is permitted.

---

# 4. Required Demo Story

The final demo must support this exact narrative.

## Step 1 — Owner creates account

Human opens Confiance.

Human authenticates through Mera/passkey.

Mera derives the owner's EVM account.

Owner deploys/initializes the Confiance smart account.

Owner funds the account with testnet assets.

---

## Step 2 — Register the agent

Create/register the Payroll Agent identity through ERC-8004 Identity Registry.

Create or connect the agent's wallet using Privy.

The agent receives its own EVM address.

Register that agent address as an authorized Confiance session.

---

## Step 3 — Configure policy

Owner establishes:

```text
Agent:
Payroll Agent

Maximum payment:
$50

Allowed asset:
Cleanverse A-Token / configured compliant asset

Recipient rule:
A-Pass eligible

Session expiry:
24 hours

Required condition:
GitHub PR #42 merged
```

This policy must be enforced by the Confiance contract.

Do not rely on frontend checks.

---

# 5. Main Demo

Initially:

```text
GitHub PR #42 = OPEN
```

The agent attempts:

```text
Pay David $30
```

Confiance should reject the payment because the external condition has not been verified.

Display:

```text
PAYMENT BLOCKED

Reason:
Required milestone not verified.
```

---

# 6. Chainlink CRE Verification

GitHub is an external condition.

Use Chainlink CRE to verify the condition.

Flow:

```text
GitHub
   ↓
Chainlink CRE
   ↓
verified report
   ↓
Confiance.onReport(...)
   ↓
milestoneVerified = true
```

The CRE workflow must verify the actual GitHub state.

Do not let the frontend set:

```text
milestoneVerified = true
```

Do not let the AI set it.

Do not let an arbitrary backend endpoint set it.

Only the authorized Chainlink reporting path may update the verified condition.

---

# 7. Successful Payment

After PR #42 is merged:

CRE verifies it.

Confiance records:

```text
Milestone 3 = VERIFIED
```

The agent independently retries:

```text
Pay David $30
```

Confiance checks:

```text
Agent registered?        YES
Session active?          YES
Session expired?         NO
Amount <= $50?           YES
Allowed asset?           YES
Recipient eligible?      YES
Milestone verified?      YES
```

Then:

```text
EXECUTE
```

The contractor receives the payment.

No human wallet confirmation should occur at this stage.

---

# 8. Mandatory Failure Demonstrations

The final application must demonstrate that Confiance is actually enforcing authority.

## 8.1 Over-limit payment

Agent attempts:

```text
Pay David $500
```

Session limit:

```text
$50
```

Expected:

```text
REVERT

Reason:
SESSION_SPENDING_LIMIT
```

---

## 8.2 Ineligible recipient

Agent attempts to pay a recipient that does not satisfy the Cleanverse/A-Pass requirement.

Expected:

```text
REVERT

Reason:
RECIPIENT_NOT_ELIGIBLE
```

The exact Cleanverse mechanism must use the real documented/testnet integration available.

Never fake this check.

---

## 8.3 Revoked agent

Owner revokes the Payroll Agent.

The agent still possesses its private key.

The agent attempts another payment.

Expected:

```text
REVERT

Reason:
SESSION_REVOKED
```

This is one of the most important demo moments.

Display:

> **The key still exists. The authority does not.**

---

# 9. Smart Contract Architecture

Create a clean Solidity architecture.

Recommended conceptual structure:

```text
Confiance
├── ownership
├── agent/session registry
├── session policy
├── execution validation
├── spending accounting
├── expiry
├── asset restrictions
├── recipient restrictions
├── external condition state
├── Chainlink report handling
└── execution events
```

Do not unnecessarily split the system into many contracts.

Keep the MVP understandable.

---

# 10. Session Model

Each agent session should contain enough state to enforce the policy.

Conceptually:

```solidity
struct Session {
    bool active;
    address agent;
    address allowedAsset;

    uint256 spendingLimit;
    uint256 spent;
    uint256 expiry;

    bool recipientRequiresAPass;

    bytes32 requiredCondition;
}
```

The implementation may differ if a better architecture is found.

The contract must support:

### Create session

Owner-only.

### Revoke session

Owner-only.

### Execute through session

Agent/session-authorized.

### Update policy

Owner-only.

The agent must never be able to:

- increase its spending limit
- change the allowed asset
- extend its expiry
- change recipient rules
- mark external conditions verified
- create another privileged agent
- transfer ownership

---

# 11. Spending Limits

Track actual spending onchain.

Do not calculate spending only in the frontend.

At minimum:

```text
newSpent = previousSpent + requestedAmount
```

must be checked against the session's permitted limit.

Clarify whether the limit means:

- total session spending, or
- per-transaction spending.

For MVP, use:

> **maximum total session spending**

and make this explicit in the UI.

Prevent integer/decimal mistakes.

Use token decimals correctly.

Never compare raw token units with display units incorrectly.

---

# 12. Replay Protection

Agent authorization must not allow the same signed request to be replayed.

Implement nonce/replay protection.

Each execution request must have a unique nonce or equivalent mechanism.

The contract must reject reused authorization.

Test:

```text
request #1 → succeeds
request #1 replayed → reverts
```

---

# 13. Agent Authorization

The agent must be independently identifiable.

At minimum:

```text
agent address
session active
session expiry
policy
nonce
```

Do not allow arbitrary callers to execute through the session.

The contract must verify the agent's authority.

---

# 14. Account Abstraction

Do NOT introduce ERC-4337 merely for branding.

The MVP must first prove:

```text
Agent signer
     ↓
Confiance authorization
     ↓
Confiance execution
```

If ERC-4337/UserOperations materially simplify autonomous execution and can be integrated reliably on Monad testnet, it may be used.

If not, use a simpler secure smart-account execution architecture.

Do not spend the hackathon building unnecessary bundler infrastructure.

The product innovation is **bounded agent authority**, not ERC-4337 itself.

---

# 15. Autonomous Transaction Requirement

The final architecture must allow:

```text
AI agent
  ↓
agent wallet signs
  ↓
transaction/request submitted
  ↓
Confiance validates
  ↓
payment executes
```

without:

```text
human wallet popup
```

for each payment.

The human only needs to interact during:

- account setup
- funding
- agent registration
- session creation
- policy changes
- revocation

---

# 16. Agent Runtime

Build a small real agent runtime.

Do NOT build a foundation model.

Use an existing LLM.

The agent should have deterministic tools.

Recommended tools:

```text
check_github_milestone
check_payment_policy
check_recipient
check_agent_session
request_payment
check_balance
```

The LLM decides what action to request.

Deterministic code performs blockchain operations.

Do not allow the LLM to directly construct arbitrary privileged contract calls.

---

# 17. Agent Prompt

Create a strong system prompt for the Payroll Agent.

Conceptually:

```text
You are Acme's Payroll Agent.

Your job is to pay approved contractors when their required
work milestone has been verified.

You do not control the company's treasury.

You cannot modify your own permissions.

Before requesting payment:
1. Check the required milestone.
2. Check the recipient.
3. Check your active session.
4. Check the permitted amount.
5. Request payment through Confiance.

Never attempt to bypass Confiance.
Never claim that a payment succeeded unless the blockchain
transaction confirms success.
```

The agent must be aware that Confiance is the authority boundary.

---

# 18. Privy Integration

Use Privy for the agent wallet/signing layer.

Requirements:

- create/connect agent wallet
- obtain agent EVM address
- sign agent requests/transactions
- submit through the intended execution architecture

The agent wallet must be separate from the human owner.

The application should clearly display:

```text
Owner:
0x...

Agent:
0x...
```

Do not expose private keys in frontend code.

Do not store private keys in plaintext.

Do not put secrets into the repository.

---

# 19. Mera Integration

Use Mera for human owner authentication/passkey account derivation.

Requirements:

- support documented passkey providers
- derive owner EVM account
- connect owner to Confiance
- allow owner to establish/revoke agent authority

Mera is for the owner.

Do not reuse the Mera owner key as the agent key.

Handle localhost/HTTPS requirements correctly.

Pin the Mera package version used.

Document any preview-package limitations.

---

# 20. ERC-8004

Use ERC-8004 Identity Registry for the Payroll Agent identity.

The agent should have a recognizable onchain identity.

The UI should show:

```text
Payroll Agent
ERC-8004 Identity
Agent address
Status
```

Do not implement a custom reputation score.

Do not build the Validation Registry unless it becomes necessary.

Optional:

After successful execution, a separate client wallet may submit ERC-8004 reputation feedback.

The owner must not submit feedback merely to manufacture a score.

---

# 21. Chainlink CRE

Implement the GitHub milestone verification through Chainlink CRE.

Architecture:

```text
GitHub PR
    ↓
CRE workflow
    ↓
workflow verifies state
    ↓
signed report
    ↓
Confiance.onReport
    ↓
condition becomes verified
```

Requirements:

- actual GitHub API/data
- actual CRE workflow
- actual authorized report path
- actual Monad testnet contract write
- event emitted when verification succeeds

The frontend must read the resulting onchain state.

Do not use a backend boolean as the source of truth.

---

# 22. Cleanverse Integration

This is the highest-risk integration and MUST be investigated before locking the implementation.

Do not invent Cleanverse interfaces.

Before implementing the final payment path, determine from official/current Cleanverse developer materials:

1. Can a smart-contract account hold Cleanverse A-Tokens?
2. Can a smart-contract account send A-Tokens?
3. Can the Confiance smart account be recognized/associated with an A-Pass?
4. What is the official onchain A-Pass eligibility interface?
5. What are the current Monad testnet contract addresses?
6. What are the current ABIs?
7. How is recipient eligibility checked?
8. Is compliance enforced by the asset/transfer contract itself?
9. Can this work:

```text
Agent
 ↓
Confiance
 ↓
Cleanverse A-Token
 ↓
A-Pass recipient
```

If the official Cleanverse team/docs confirm the intended flow, implement it directly.

If they do not support smart-contract principals in the required way:

**DO NOT FAKE THE INTEGRATION.**

Instead:

- preserve the Confiance policy architecture
- isolate the Cleanverse adapter
- document the exact blocker
- implement the closest real testnet-supported path
- clearly label unsupported portions

The application must never claim a Cleanverse-enforced transfer if Cleanverse is not actually enforcing it.

---

# 23. Cleanverse Adapter

Create an abstraction such as:

```text
CleanverseAdapter
```

Responsibilities:

```text
checkRecipientEligibility(address)
checkAssetEligibility(address)
executeCompliantTransfer(...)
```

The exact implementation must follow official Cleanverse interfaces.

Do not hard-code assumptions about A-Pass contracts.

Keep addresses/configuration in environment/config files.

---

# 24. Envio

Use Envio for indexed activity/history.

Index relevant Confiance events:

```text
AgentRegistered
SessionCreated
SessionRevoked
PolicyUpdated
PaymentRequested
PaymentExecuted
PaymentRejected
ConditionVerified
```

The dashboard should be able to show historical activity.

Envio is NOT security.

Never use Envio data as the contract's authorization source.

---

# 25. Events

Emit clear events.

At minimum:

```solidity
event AgentRegistered(
    address indexed agent,
    bytes32 indexed identity
);

event SessionCreated(
    address indexed agent,
    uint256 spendingLimit,
    uint256 expiry
);

event SessionRevoked(
    address indexed agent
);

event PaymentExecuted(
    address indexed agent,
    address indexed recipient,
    address indexed asset,
    uint256 amount
);

event PaymentRejected(
    address indexed agent,
    address indexed recipient,
    uint256 amount,
    bytes32 reason
);

event ConditionVerified(
    bytes32 indexed condition
);
```

Exact signatures may be improved during implementation.

Events must contain enough information for Envio and frontend activity history.

---

# 26. Frontend

Build a polished consumer-style dashboard.

Do NOT make it look like a generic enterprise admin panel.

The experience should immediately communicate:

> **This agent has money, but it does not have unrestricted authority.**

---

# 27. Main Dashboard

Show:

```text
CONFIANCE

Payroll Agent
● Active

Agent:
0x...

Owner:
0x...

Session:
ACTIVE

Spending limit:
$50

Spent:
$30

Remaining:
$20

Expires:
23h 14m

Asset:
Cleanverse A-Token

Recipient:
A-Pass required

Condition:
Milestone 3 ✓ VERIFIED
```

---

# 28. Activity Timeline

Show real indexed/onchain events.

Example:

```text
✓ Agent registered
✓ Session created
✓ Milestone verification received
✓ Payment executed — $30
✕ Payment rejected — $500 exceeds limit
✕ Payment rejected — recipient not eligible
✕ Agent session revoked
✕ Agent payment rejected — session revoked
```

Do not fabricate events.

---

# 29. Agent Page

Show:

- agent name
- ERC-8004 identity
- agent address
- session status
- current policy
- spending
- expiry
- activity
- revoke button

The revoke button must trigger a real owner-authorized transaction.

---

# 30. Policy Page

Show human-readable rules:

```text
Payroll Agent can:

✓ Spend up to $50
✓ Use Cleanverse A-Token
✓ Pay A-Pass eligible recipients
✓ Operate for 24 hours
✓ Pay only after Milestone 3 verification
```

Use plain language.

Avoid technical jargon where unnecessary.

---

# 31. Payment Request UI

The agent should have a visible activity/request interface.

Example:

```text
Payroll Agent

I found that David's required milestone
has been completed.

Requested payment:

$30

Recipient:
David

Reason:
Milestone 3 completed

[Request Payment]
```

The button should trigger the actual agent execution path.

It must not simply call a frontend contract function as the owner.

---

# 32. Demo Attack / Failure UI

Create a section that lets the demo clearly show Confiance stopping unauthorized behavior.

Examples:

```text
Agent attempts $500
        ↓
CONFIANCE REJECTED
        ↓
Limit = $50
```

Then:

```text
Owner revokes agent
        ↓
Agent retries
        ↓
CONFIANCE REJECTED
        ↓
SESSION_REVOKED
```

This is critical to the demo.

---

# 33. Transaction Proof

After a successful payment, show:

- transaction hash
- block number
- sender
- recipient
- amount
- asset
- Monad explorer link

Never show a fake hash.

All links must correspond to real transactions.

---

# 34. Security Requirements

Never:

- expose private keys
- put secrets in frontend source
- commit `.env`
- allow agent to change its own policy
- trust frontend authorization
- trust LLM output as authorization
- use Envio as authorization
- let backend arbitrarily mark payments successful
- let backend arbitrarily mark conditions verified
- fake Cleanverse verification
- fake CRE verification
- fake blockchain transactions

---

# 35. Backend

Use a minimal backend where necessary.

Backend responsibilities may include:

- agent orchestration
- LLM interaction
- GitHub API access for the agent
- transaction submission infrastructure
- reading blockchain/indexer state
- preparing deterministic tool results

Backend must NOT be the authority for:

- session validity
- spending limit
- owner authority
- revocation
- final payment authorization
- onchain condition verification

Those belong onchain.

---

# 36. Configuration

Create a clean environment configuration.

Example:

```text
MONAD_RPC_URL=
MONAD_CHAIN_ID=

CONFIANCE_ADDRESS=

PRIVY_APP_ID=
PRIVY_APP_SECRET=

MERA_CONFIG=

ERC8004_IDENTITY_REGISTRY=

CLEANVERSE_A_TOKEN=
CLEANVERSE_APASS_CONTRACT=
CLEANVERSE_CCP=

CHAINLINK_CRE_CONFIG=

GITHUB_REPO=
GITHUB_PR_NUMBER=

ENVIO_CONFIG=
```

Do not commit secret values.

Provide `.env.example`.

---

# 37. Repository Structure

Use a clear structure.

Suggested:

```text
confiance/
├── AGENTS.md
├── README.md
├── apps/
│   └── web/
├── contracts/
│   ├── src/
│   ├── test/
│   └── script/
├── agent/
│   ├── runtime/
│   ├── tools/
│   └── prompts/
├── cre/
│   └── workflows/
├── indexer/
├── packages/
│   └── shared/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── DEMO.md
│   └── INTEGRATIONS.md
├── .env.example
└── README.md
```

Adjust if a better monorepo architecture is appropriate.

Do not over-engineer.

---

# 38. Testing

Tests are mandatory.

## Smart contract tests

Test:

### Owner

- only owner can create session
- only owner can revoke session
- only owner can modify policy

### Agent

- registered agent can request
- unregistered agent rejected
- revoked agent rejected
- expired session rejected

### Spending

- $30 under $50 succeeds
- $50 succeeds
- $51 fails
- $500 fails
- cumulative spending cannot exceed limit

### Replay

- nonce works
- reused request fails

### Conditions

- unverified condition fails
- verified condition succeeds
- unauthorized caller cannot mark condition verified

### Recipient

- valid recipient succeeds
- invalid recipient fails

### Ownership

- agent cannot become owner
- agent cannot modify its own limits

---

# 39. Integration Tests

Test the real paths where possible:

```text
Mera → owner account
Privy → agent account
Agent → Confiance
Confiance → token
CRE → Confiance
Cleanverse → Confiance/payment
ERC-8004 → agent identity
Envio → events
```

Do not consider an integration complete merely because the SDK imports.

It must perform the required real operation.

---

# 40. End-to-End Demo Test

The repository must have an end-to-end test or documented reproducible procedure for:

```text
1. Create owner
2. Deploy Confiance
3. Fund account
4. Register agent
5. Create session
6. GitHub PR OPEN
7. Agent requests $30
8. Payment blocked
9. PR MERGED
10. CRE verifies
11. Agent requests $30
12. Payment succeeds
13. Agent requests $500
14. Payment blocked
15. Revoke agent
16. Agent requests $30
17. Payment blocked
```

---

# 41. Error Handling

Errors must be human-readable.

Map contract errors to messages such as:

```text
SESSION_REVOKED
→ This agent no longer has permission to act.

SPENDING_LIMIT_EXCEEDED
→ The agent's request exceeds its authorized spending limit.

SESSION_EXPIRED
→ This agent's authorization has expired.

CONDITION_NOT_VERIFIED
→ The required external condition has not been verified.

RECIPIENT_NOT_ELIGIBLE
→ The recipient does not satisfy the required compliance rule.

ASSET_NOT_ALLOWED
→ This asset is not permitted by the agent's policy.
```

Do not expose confusing raw RPC errors as the primary UX.

---

# 42. README

README must clearly explain:

## One sentence

> Confiance is an onchain execution firewall that lets AI agents act autonomously without giving them unrestricted control of a wallet.

## Problem

AI agents need to make financial decisions, but unrestricted wallet access is dangerous.

## Solution

Human establishes bounded authority.

Agent operates autonomously.

Confiance enforces policy.

## Architecture

Include a simple diagram.

## Integrations

Explain:

- Monad
- Mera
- Privy
- Chainlink CRE
- Cleanverse
- ERC-8004
- Envio

## Demo

Explain the full Payroll Agent scenario.

## Security model

Explain why the agent cannot modify its own authority.

## Limitations

Explicitly document any integration that could not be completed.

Never hide limitations.

---

# 43. Architecture Documentation

Create:

`docs/ARCHITECTURE.md`

Explain:

```text
Owner
 ↓
Mera
 ↓
Owner EOA
 ↓
Confiance
 ↓
Session Policy
 ↓
Agent
 ↓
Privy Agent Wallet
 ↓
Payment Request
 ↓
Confiance Validation
 ↓
Cleanverse / Token
 ↓
Recipient
```

Also explain Chainlink:

```text
GitHub
 ↓
CRE
 ↓
Signed Report
 ↓
Confiance
```

---

# 44. Security Documentation

Create:

`docs/SECURITY.md`

Explain:

### Threat

Compromised agent key.

### Protection

The key only has bounded authority.

### Threat

Agent hallucination.

### Protection

LLM output does not determine authorization.

### Threat

Agent attempts $500.

### Protection

Onchain spending limit.

### Threat

Agent tries to modify its own permissions.

### Protection

Owner-only policy mutation.

### Threat

Owner revokes agent.

### Protection

Contract checks session status.

### Threat

Frontend compromised.

### Protection

Critical authorization exists onchain.

---

# 45. Demo Documentation

Create:

`docs/DEMO.md`

The demo must follow:

## Scene 1

Owner creates Confiance.

## Scene 2

Payroll Agent registered.

## Scene 3

Policy:

```text
$50 max
24 hours
A-Token
A-Pass recipient
Milestone 3
```

## Scene 4

PR #42 OPEN.

Agent requests $30.

**BLOCKED.**

## Scene 5

Merge PR #42.

CRE verifies.

## Scene 6

Agent autonomously requests $30.

**SUCCESS.**

No human approval.

## Scene 7

Agent requests $500.

**BLOCKED.**

## Scene 8

Owner revokes agent.

Agent still possesses key.

Agent requests $30.

**BLOCKED.**

Final line:

> **The key still exists. The authority does not.**

---

# 46. UX Philosophy

The application must feel like a consumer product rather than a blockchain engineering dashboard.

Avoid:

- excessive terminal-looking UI
- unnecessary technical panels
- meaningless charts
- generic AI chat UI
- fake “AI thinking” animations
- huge walls of blockchain terminology

The important information should be immediately understandable:

```text
WHO can act?
WHAT can they do?
HOW MUCH can they spend?
WHEN does it expire?
WHAT condition must be satisfied?
WHAT happened?
```

---

# 47. AI UX

Do not build a generic chatbot.

The agent should appear task-oriented.

Example:

```text
PAYROLL AGENT

Task:
Pay approved contractor after milestone completion.

Current status:
Waiting for Milestone 3

GitHub:
PR #42 — OPEN

Authority:
$50 / 24h
```

After verification:

```text
Milestone 3 verified.

I can now request the authorized
$30 contractor payment.
```

Then execute.

---

# 48. No Fake AI

Do not create a fake “AI agent” that simply follows hardcoded buttons.

The agent must actually invoke the agent runtime/LLM and use its tools.

However, keep the deterministic blockchain/security layer outside the LLM.

Correct:

```text
LLM
 ↓
tool request
 ↓
deterministic tool
 ↓
agent signer
 ↓
Confiance
```

Incorrect:

```text
LLM directly decides:
"transaction successful"
```

---

# 49. No Fake Decentralization

Do not claim something is decentralized merely because it uses blockchain.

Clearly distinguish:

- offchain AI reasoning
- offchain orchestration
- onchain authorization
- onchain settlement
- onchain events

---

# 50. No Fake Compliance

Cleanverse must be a real integration if claimed.

If the final implementation cannot make Confiance itself interact with Cleanverse in the required manner, say so explicitly.

Do not:

```text
Frontend:
recipientEligible = true
```

and call that Cleanverse compliance.

The compliance claim must correspond to actual Cleanverse infrastructure.

---

# 51. No Fake CRE

The external condition must come through the actual CRE verification path.

Do not simply expose:

```text
POST /verify
```

and set the condition.

The final architecture must show:

```text
GitHub
→ CRE
→ authorized onchain report
→ Confiance
```

---

# 52. Deployment

Deploy contracts to Monad testnet.

Record:

- contract addresses
- transaction hashes
- deployment block
- chain ID
- explorer links

Update:

`docs/DEPLOYMENTS.md`

Example:

```text
Monad Testnet
Chain ID: ...

Confiance:
0x...

ERC-8004:
0x...

Token:
0x...

CRE receiver:
0x...
```

Only include verified addresses.

---

# 53. Production Quality

Before declaring complete:

Run:

```text
lint
typecheck
unit tests
contract tests
integration tests
production build
```

Fix all errors.

No ignored TypeScript errors.

No ignored Solidity compiler warnings that affect correctness.

No broken mobile layout.

No missing loading states.

No unhandled wallet/network changes.

---

# 54. Network Safety

The frontend must clearly identify:

```text
Monad Testnet
```

Do not accidentally submit transactions to mainnet.

Validate chain ID.

Handle wrong-network state.

Provide a clear switch/network guidance flow.

---

# 55. Wallet Safety

Never request unnecessary wallet permissions.

Never ask users for seed phrases.

Never expose private keys.

Never store wallet secrets in localStorage unless the provider's documented architecture explicitly permits secure handling.

---

# 56. Agent Safety

The agent must not be able to:

- withdraw all treasury funds
- change policy
- change owner
- register another privileged agent
- disable compliance
- mark CRE conditions verified
- bypass the Confiance execution path

The agent can only operate within its registered session.

---

# 57. Owner Safety

Owner can:

- create session
- revoke session
- modify policy
- fund account
- inspect history

Owner should NOT need to sign routine agent payments.

---

# 58. Completion Criteria

Do not declare the project finished until all of the following are true.

### Core

- [ ] Monad testnet deployment
- [ ] Confiance smart account works
- [ ] Owner established
- [ ] Agent has separate wallet
- [ ] Agent registered
- [ ] Session policy stored onchain
- [ ] Agent can execute authorized payment without human payment approval
- [ ] Spending limit enforced onchain
- [ ] Session expiry enforced
- [ ] Revocation enforced
- [ ] Replay protection implemented

### Agent

- [ ] Real LLM agent
- [ ] Real tools
- [ ] Real agent signer
- [ ] Agent can request payment autonomously
- [ ] Agent cannot modify policy

### Integrations

- [ ] Mera
- [ ] Privy
- [ ] ERC-8004
- [ ] Chainlink CRE
- [ ] Cleanverse, subject to confirmed supported architecture
- [ ] Envio

### UX

- [ ] Owner onboarding
- [ ] Agent registration
- [ ] Policy display
- [ ] Agent activity
- [ ] Payment execution
- [ ] Failure states
- [ ] Revoke flow
- [ ] Explorer links

### Documentation

- [ ] README
- [ ] Architecture
- [ ] Security
- [ ] Demo
- [ ] Deployments
- [ ] Integration limitations

---

# 59. Development Order

Do NOT attempt all integrations simultaneously.

Build in this order.

## Phase 1 — Core contract

Build and test:

```text
owner
agent
session
limit
expiry
revocation
nonce
execution
```

Prove autonomous agent authorization with a local/test signer.

---

## Phase 2 — Monad

Deploy the core contract to Monad testnet.

Perform real token execution.

Verify explorer transactions.

---

## Phase 3 — Agent runtime

Build the Payroll Agent.

Connect:

```text
LLM
+
tools
+
agent signer
```

Prove:

```text
agent → Confiance → payment
```

without owner signing the payment.

---

## Phase 4 — Privy

Replace test signer with the real Privy agent wallet.

Verify the agent address is recognized by Confiance.

---

## Phase 5 — Mera

Connect the owner flow.

Human:

```text
Mera/passkey
→ owner account
→ Confiance
```

---

## Phase 6 — ERC-8004

Register Payroll Agent identity.

Display it in the dashboard.

---

## Phase 7 — Chainlink CRE

Build GitHub milestone verification.

Prove:

```text
PR OPEN
→ payment blocked

PR MERGED
→ CRE
→ onchain verification
→ payment allowed
```

---

## Phase 8 — Cleanverse

Only implement once the exact official/testnet smart-account integration is confirmed.

Prove the actual compliance enforcement path.

---

## Phase 9 — Envio

Index activity.

Build history timeline.

---

## Phase 10 — UI polish

Only after the underlying transactions work.

Never spend hours polishing a button that does not execute a real transaction.

---

# 60. Smoke Tests Before Full Build

Before spending significant time on UI, perform these tests.

### Smoke Test 1

Can a separate agent wallet call the intended Confiance execution path?

### Smoke Test 2

Can Confiance transfer test assets without owner approval?

### Smoke Test 3

Does the spending cap revert correctly?

### Smoke Test 4

Does revocation prevent the same agent key?

### Smoke Test 5

Can Privy provide the required agent signer?

### Smoke Test 6

Can Mera produce the owner account?

### Smoke Test 7

Can CRE successfully report to Monad?

### Smoke Test 8

Can the intended Cleanverse smart-account path actually work?

If any smoke test fails, stop and resolve it before continuing.

---

# 61. Important Architectural Rule

Never confuse these three things:

### Intelligence

The AI decides:

> “I want to pay David.”

### Authorization

Confiance decides:

> “Is the agent allowed to pay David?”

### Settlement

The blockchain executes:

> “Transfer the funds.”

These must remain separate.

---

# 62. Final Product Statement

The completed product should make this obvious within 30 seconds:

> **Confiance lets AI agents operate autonomously while keeping financial authority under programmable human-defined constraints.**

Human:

> “You may spend up to $50 under these conditions.”

Agent:

> “I want to spend $30.”

Confiance:

> “You're authorized.”

Agent:

> “I want to spend $500.”

Confiance:

> “You're not.”

Owner:

> “I revoke you.”

Agent:

> “I still have my key.”

Confiance:

> “Your key no longer gives you authority.”

---

# 63. Final Demo Line

The final screen should end with:

> **The key still exists. The authority does not.**

And underneath:

> **Confiance — Give an AI agent a job without giving it your wallet.**

---

# 64. Codex Operating Rules

While implementing:

1. Inspect the existing repository before changing anything.
2. Preserve working code.
3. Do not rewrite functioning infrastructure unnecessarily.
4. Prefer small, verifiable changes.
5. Run tests after each major subsystem.
6. Keep integration adapters isolated.
7. Never invent SDK APIs.
8. Verify current SDK versions and method signatures from installed packages/docs.
9. Never fabricate blockchain addresses.
10. Never fabricate transaction hashes.
11. Never fake sponsor integrations.
12. Never silently replace a failed real integration with a mock.
13. If an integration is blocked, document the exact blocker.
14. Prefer a smaller working implementation over a larger fake one.
15. Keep secrets out of Git.
16. Maintain `.env.example`.
17. Update documentation as architecture changes.
18. Before declaring completion, perform the full end-to-end demo.
19. Verify that the human does NOT sign the routine agent payment.
20. The final implementation must prove the central Confiance thesis with real testnet transactions.

## Definition of Done

Confiance is done when a real human can establish a bounded session for a real agent, the real agent can independently request and execute an authorized payment on Monad testnet without the human signing that payment, and the same agent is demonstrably prevented from exceeding or retaining authority beyond the policy.

**Build the authorization firewall first. Integrate everything else around that core.**
