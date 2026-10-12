# Deployments

## Live-domain owner account — 2026-10-12

- Network: Monad Testnet, chain **10143**.
- Confiance: `0xde4dfd84ed78c4c65d7670e22be1e002403f057f`.
- Owner: `0xaf00668625e038f43c302283aECd6fF90265E42F`.
- Deployment block: **70494094**.
- [Deployment transaction](https://testnet.monadexplorer.com/tx/0x155e532677844224c260412d433beb9fbd605f236e8a3e14a2f06b7cf3085938).

The live-domain passkey owner deployed this account. The receipt, chain,
constructor calldata against the compiled artifact, deployer and immutable
onchain owner were checked independently. Hosted configuration now points to
this account, with a separate MongoDB namespace and monitoring disabled during
setup. Treasury funding, agent/session authorization and CRE reporter approval
must be established on this account before its first autonomous payment.
The historical payments below belong to the original account.

Hosted cutover is active on Vercel and Render. The replacement CRE workflow is
`0x0040547646dcd6b590f75960671640368de8850e86b27cce7fad71ef922ac46f`,
with its configuration pinned to the new receiver. Owner reporter approval and
new-account delivery remain pending. Envio deployment `647f4f0` is synced and
promoted with both addresses; its actual GraphQL endpoint is
`https://indexer.dev.hyperindex.xyz/a7c50be/v1/graphql`. The endpoint returned all
17 original-account events after cutover. No new-account payment is claimed yet.

## Hosted PR #2 rehearsal

Frontend: https://confiance-eta.vercel.app
Backend: https://confiance-backend.onrender.com (free preview; can sleep).

CRE report: [transaction](https://testnet.monadexplorer.com/tx/0x237d5539133dc31be0c9278de41be2c0c883e8d480c0f506c04347dc867036ff),
block **70465820**, matching ConditionVerified event for PR #2.
Authorized workflow: `0x000aa0784b0fb840ea903da674bf9964ec02a045037f7cb115ed4c2acd43b9ca`.

Render's autonomous **30 CTT** payment:
[transaction](https://testnet.monadexplorer.com/tx/0x6eaecc46d20f3513452cb4e0bf6e591c10a3f38285d3cdec9276260e8f46870c),
block **70465941**, agent sender, expected Confiance target and matching
PaymentExecuted event independently checked. Nonce **1**, generation **5**.
This session spent **30 CTT**, leaving **20 CTT**. Contractor total balance was
**60 CTT**, including the preceding PR #1 rehearsal.

The owner saved/started the task in the local app. Render's worker observed the
open PR, then paid after the real merge and CRE delivery without an owner payment
signature. The temporary local worker was stopped before the merge. Monitoring
automatically paused after recognizing the task was paid. Machine-readable evidence:
[payment](research/hosted-payment.json), [CRE](research/cre-deployment.json).

The later live-domain owner account and its pending payment setup are documented
above. Envio now indexes both accounts. This test token is not
Cleanverse-compliant.

## Original account deployment

Verified deployment receipt:

```json
{
  "network": "Monad Testnet",
  "chainId": 10143,
  "contract": "0x952bbdDeCE639f678733F310890d15E28b213489",
  "owner": "0x33fD00741137E0c7EA5cbAF143DAE846AedbcDF5",
  "deploymentHash": "0x4c36aab404ca0b2e3b887096127e9e7a63ce66cdbfa84cec8623d4c4bbf55179",
  "deploymentBlock": "70364758",
  "deployer": "0x9a62195bb2c8eceaaf306ec7ee87f7e4994ba11d",
  "explorer": "https://testnet.monadexplorer.com/tx/0x4c36aab404ca0b2e3b887096127e9e7a63ce66cdbfa84cec8623d4c4bbf55179",
  "verification": "Chain, successful creation receipt, code presence and owner checked. Publish source verification separately."
}
```

No ERC-8004, Cleanverse or CRE integration is implied by this record.

## Verified agent identity

Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`.
Agent: `0x9A62195Bb2C8eCeAaF306EC7Ee87f7e4994Ba11D`.
Identity ID: **2210**, minted at Monad testnet block **70362555**.
[Mint transaction](https://testnet.monadexplorer.com/tx/0x20ce4773903a37466857b395e5c1d902e57c391a47066e647b15279bb1ac7d0d).
Sender/calldata, event and current ownership/wallet binding verified.
No session, CRE delivery, compliance or autonomous payroll payment is implied.

## Historical PR #1 CRE workflow

Registry: Chainlink private registry. Status returned at that deployment: **Active**.
Name: `confiance-github-milestone`.
Workflow ID: `0x002de83854f367d591931bbd62aa30913140bd61330b59fe5df3c67a18b580f3`.
Workflow owner: `0x1db255D03A90f194483fEc22A9a32965e98a521E`.
Tenant-listed Monad forwarder: `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`.
Owner authorization is confirmed onchain. The actual report delivered
`ConditionVerified` for `samscript18/Confiance` PR #1 at block **70418309**.
[CRE report transaction](https://testnet.monadexplorer.com/tx/0x8fe3b6a5b5865b45f151713190126bee9c23591ea09fced1f47514ce481a7b9d).
Historical evidence is retained under `previousDeployment` in
[deployment evidence](research/cre-deployment.json). The current live-owner
workflow is identified in the cutover section above.

## Autonomous payroll proof — 2026-10-12

The human saved the corrected policy, generation **3**. A real Vertex Gemini
agent checked its tools and requested **30 CTT** through its separate Privy signer.
No owner signature was used for this payment.

- Asset: `0xaBC746C3C77C73160ACEB419349C6980De4567BE`, six decimals.
- Contractor: `0xF3481b1A06cc5f19a3BF0843eDb296F96083c505`.
- [Successful payment](https://testnet.monadexplorer.com/tx/0xa9d80f0c7087fe812b527737a440ce63e6801b6acb95e313126ab8ac3a03a5fe), block **70422755**.
- Independently checked agent sender, Confiance target, successful receipt and
  matching `PaymentExecuted` event: 30,000,000 raw units, nonce 0, generation 3.
- Contractor balance: **30 CTT**; session spent **30**, remaining **20** of 50.
- [500-token diagnostic](https://testnet.monadexplorer.com/tx/0x3fedaa78f306389c35712b3b1af3784d8679ba4e5c4c1e1155f9b23731ad82d8), block **70423405**, reverted. Pre-submission simulation returned `SESSION_SPENDING_LIMIT`.

- [Reused-nonce diagnostic](https://testnet.monadexplorer.com/tx/0x480fd9af55d58c6ad0fa83e139c49794c9f9ec55b3d56d38ae6a66e27eda30d8), block **70423647**, reverted. Pre-submission simulation returned `INVALID_NONCE` for consumed nonce 0.

The spending-limit attack is a deterministic diagnostic using the same Privy
signer, separate from the LLM payment proof. CTT is not USD or Cleanverse.

## Same-key revocation proof

- [Owner revocation](https://testnet.monadexplorer.com/tx/0x7a69cbdbf6ccfd9bbcb13cab63bf22d2fad99f80e2829f338876fd42ba151237), block **70424861**; Envio indexed `SessionRevoked`.
- [Same Privy key retries 30 CTT](https://testnet.monadexplorer.com/tx/0x24fe8cb25754b00cf5db257e443bd1d0c34eb85b4b4c0beb04ad2104913b4fa6), block **70425005**, reverted.
- Pre-submission simulation identified `SESSION_REVOKED`. Verified sender,
  target and exact calldata use the same agent, generation 3 and nonce 1.
- Onchain session is inactive; cumulative spent remains 30 CTT and contractor
  balance remains 30 CTT. No owner signature was used for the failed retry.

The core autonomous-payment and authorization demonstration is proven on Monad.
Cleanverse enrollment, issuance and compliant settlement remain outstanding.
