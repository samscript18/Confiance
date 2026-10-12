# Integration evidence and blockers

Inspected 2026-10-08. No integration is complete merely because its SDK imports.

## Monad

`cast chain-id --rpc-url https://testnet-rpc.monad.xyz` returned **10143**.
Confiance has not been deployed. No funded owner or agent exists for this project.
The Foundry deployment script refuses other chain IDs and uses an encrypted
keystore. Receipt recording also checks the transaction creation calldata against
the compiled Confiance artifact and configured owner.

## Privy

SDK: `@privy-io/node` **0.35.0**, exact pinned. Verified installed method signatures:
`wallets().create`, `wallets().get`, and
`wallets().ethereum().sendTransaction(walletId, input)`.
The transaction uses CAIP-2 `eip155:10143`, a fixed Confiance target and encoded
`executePayment` calldata. No owner key is involved. There is no fallback signer.

Blocked: no app ID/secret, wallet or gas funding. Adapter compile/tests do not
prove Privy signing or Monad submission. Wallet provisioning requires an actual
app and saves only the public wallet identifier/address in configuration.

Published 0.35.0 declarations omit `NullableHeaders` and the `HPKESender` interface.
0.34.0 and 0.25.0 were checked and have the same defects. The postinstall script
is pinned to 0.35.0 and adds those types to both CJS and ESM declarations using
the exact shapes in shipped headers/cryptography runtime code. It changes no
executable code and does not suppress TypeScript errors. Review/remove the repair
when upstream fixes the declarations.

Sources: [Node SDK setup](https://docs.privy.io/basics/nodeJS-node/setup),
[official SDK repository](https://github.com/privy-io/node-sdk),
[Ethereum transaction signing](https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction).

## LLM

The runtime supports an explicitly configured HTTPS chat-completions provider
with the documented function-tool protocol. A turn returns tool calls; the
runtime validates inputs, executes deterministic tools and returns results to
the model. Twelve turns maximum, one payment submission attempt per run.
Model prose is never a transaction result.

Blocked: no provider key, endpoint or model. No paid model call was made; no
autonomous LLM execution has been claimed as verified.

Reference: [Mistral function calling](https://docs.mistral.ai/capabilities/function_calling).

## Mera

Installed and pinned `@category-labs/mera` **0.2.0** with actual exports inspected. The browser implements passkey creation/recovery, BIP-44 derivation, viem signing, deployment, funding, session setup/update and revocation. SDK signing/session-end behavior and Mera-signed server owner authentication are tested.

The documented owner flow is WebAuthn PRF → BIP-44-derived secp256k1 account →
Mera signing session → viem owner transactions. Credential metadata can be kept
in localStorage; secret PRF output and derived key cannot. End/zero the signing
session on sign-out. HTTPS or localhost and a PRF-capable authenticator are
required. Domain changes can change passkey availability; browser/provider
compatibility must be smoke-tested with the owner.

Source: [official Monad Mera guide](https://monad.docsbot.app/guides/mera).
A physical PRF-capable authenticator ceremony and a funded owner transaction remain unverified. An encrypted deployment keystore is only an interim test signer, not Mera authentication. The browser clears root/key buffers and ends sessions on sign-out, unmount and timeout.

## ERC-8004

The official registry repository lists Monad testnet identity registry
`0x8004A818BFB912233c491871b3d84c89A494BD9e`. Monad RPC confirmed chain 10143, deployed code and getVersion() = 2.0.0 on 2026-10-08. The adapter checks that version before using the official register/getAgentWallet/ownerOf/Registered ABI.
The Privy agent-signed registration adapter is implemented, including receipt, transaction calldata and verified wallet-binding checks. No Payroll Agent identity has been minted. Confiance's owner-supplied identity
commitment is metadata, not proof of ERC-8004 registration. Bind the eventual
commitment to chain, registry and minted token ID; the agent EOA remains the
execution authority checked by Confiance.

Source: [official ERC-8004 registry contracts](https://github.com/erc-8004/erc-8004-contracts).

## Chainlink CRE

Installed CLI **1.33.0**, pinned CRE SDK **1.23.0** and Bun **1.4.2**. The public-GitHub milestone workflow is implemented and compiles to WASM with strict types and runtime compatibility checks. It validates repository/PR/merge evidence, reaches identical consensus, checks prior verification and generates/writes the report through CRE. Compilation is not DON execution or live reporting proof. The receiver follows
the documented `onReport(bytes,bytes)` and ERC165 standard. Production metadata
can be 64 bytes, so a strict 62-only gate would incorrectly reject real delivery.
Both 62 and 64-byte layouts are locally tested.

`cre workflow supported-chains --output json --non-interactive` was attempted
with network access. Tenant validation failed with **403 Forbidden** during token
refresh. No authenticated chain/forwarder directory is available for this project.
Monad testnet production-write support and the correct authorized forwarder must
be confirmed from that directory. Mainnet support is not testnet proof.

Blocked: authenticated CRE tenant/deployment access, confirmed testnet reporting
path, actual GitHub milestone repo/PR and deployed Confiance receiver. No backend
endpoint can set verification. No mock forwarder is used in deployment scripts.

Sources:
[consumer contracts](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts),
[tenant supported-chain command](https://docs.chain.link/cre/reference/cli/workflow),
[forwarder directory](https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory).

## Cleanverse

Sources:
[official site](https://cleanverse.com),
[official ClevrPay repository](https://github.com/cleanverseorg/clevrpay),
[API documentation](https://github.com/cleanverseorg/clevrpay/blob/main/skills/clevrpay/references/api-doc.md),
[Access Core ABI](https://github.com/cleanverseorg/clevrpay/blob/main/skills/clevrpay/references/access_core.md).

The official sandbox `query_chain_config` endpoint returned Monad **10143**.
Using Monad's public RPC, code presence was verified for:

| Component        | Sandbox Monad address                        |
| ---------------- | -------------------------------------------- |
| A-Pass           | `0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9` |
| A-Token policy   | `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd` |
| aUSDC            | `0xaC0893567D43C3E7e6e35a72803df05416C1f20D` |
| Access Core      | `0x8F118338a1fa41E7Fa86Be19A4e8B99Ed58A6EcC` |
| Origin test USDC | `0x534b2f3A21130d7a60830c2Df862319e593943A3` |

These are third-party discovery records, not Confiance deployment addresses.
The sanitized [research snapshot](research/cleanverse-sandbox.json) excludes
returned RPC credentials and operator configuration. Refresh discovery before use.

| Required question                        | Evidence / unresolved point                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Smart account can hold A-Tokens?         | Not confirmed; no funded account or enrollment proof                                                                     |
| Smart account can send A-Tokens?         | Docs describe ERC-20 transfer, but smart-contract principal support is unconfirmed                                       |
| Confiance can be associated with A-Pass? | Docs describe wallet magic-link verification and backend address registration; contract enrollment procedure unconfirmed |
| Official onchain eligibility interface?  | API documents `query_apass`; complete onchain A-Pass/CCP eligibility ABI was not found in retrieved references           |
| Monad addresses?                         | Sandbox endpoint and code checks above; current live config is authoritative                                             |
| ABIs?                                    | Access Core `withdraw(address,uint256,address)` is documented; full eligibility/transfer-policy ABI unresolved           |
| Recipient check?                         | Documented API exposes tier/expiry/state, but an API response cannot enforce this contract's onchain authority           |
| Transfer compliance enforced by asset?   | Public docs describe both-address A-Pass gating; actual deployed policy enforcement not experimentally proven            |
| Agent → Confiance → A-Token → recipient? | Cannot claim supported until enrollment and direct contract transfer succeed                                             |

No Cleanverse adapter implementation is fabricated. `IComplianceAdapter` is the
internal extension boundary only. The closest currently proven execution is
an exact-transfer test ERC-20 with owner-pinned recipient, clearly without
A-Pass compliance. No claim is made that Cleanverse is unsupported; the specific
smart-account pattern remains unconfirmed.

## Envio

Envio **3.14.0** is installed. Activity schema and all event handlers pass generated-type checking. A skipped address-free codegen configuration provides local type validation. Production configuration is generated only from a receipt-checked deployment record. No live indexing has been exercised.
Index `AgentRegistered`, `SessionCreated`, `PolicyUpdated`, `SessionRevoked`,
`PaymentRequested`, `PaymentExecuted`, `ConditionVerified`, and `ReporterConfigured`.
The UI must reconcile current session authority from the chain, not indexer state.

Reverted transactions remove events. Index success logs with Envio and attach
separately identified reverted receipts for rejection history. Never manufacture
contract rejection events to fill an activity timeline.

## Dashboard and operational controls

Next.js **16.4.0**, React **19.3.0**, TypeScript **6.0.3**. Production build and
browser checks cover empty setup state, mobile overflow, unauthorized/foreign-origin
mutation rejection, Mera-signed owner authentication and nonce replay rejection.
Owner transactions and Privy agent payments are separate code paths. Polling,
single-host locking, pending-proof reconciliation and receipt-backed task deduplication
are implemented. No funded provider call or complete Monad payroll demo was run.

## Temporary dependency repairs

Strict declaration checking exposed defects in the pinned CRE and Envio packages.
`scripts/repair-integration-types.mjs` is version-gated and changes declarations only:
CRE's circular lookup of globals is replaced with the installed DOM/Node constructor
shapes; CreBuffer's backing buffer is explicitly ArrayBuffer. Envio generic array/key
indexing is constrained correctly and selected event types retain mandatory event
names. No executable SDK code is changed, and no TypeScript check is disabled.
The workflow uses the documented unrestricted type entry with compiler runtime
compatibility enforcement still active; it imports no Node/browser runtime APIs.

TypeScript 7 lacks the compiler API required by CRE's compilation scripts, so the
workspace uses **6.0.3**, which supports the current Next DOM types and CRE compiler.
Compatible overrides pin Envio's Express dependency to **4.22.3**, body-parser to
**1.20.8** and ws to **8.21.0**. The resulting installed dependency audit reports zero
advisories. Re-review/remove these repairs as upstream declarations/dependencies change.
