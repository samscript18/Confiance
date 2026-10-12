# Deployments

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

## Deployed CRE workflow

Registry: Chainlink private registry. Status returned by deployment: **Active**.
Name: `confiance-github-milestone`.
Workflow ID: `0x002de83854f367d591931bbd62aa30913140bd61330b59fe5df3c67a18b580f3`.
Workflow owner: `0x1db255D03A90f194483fEc22A9a32965e98a521E`.
Tenant-listed Monad forwarder: `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`.
Owner authorization is confirmed onchain. The actual report delivered
`ConditionVerified` for `samscript18/Confiance` PR #1 at block **70418309**.
[CRE report transaction](https://testnet.monadexplorer.com/tx/0x8fe3b6a5b5865b45f151713190126bee9c23591ea09fced1f47514ce481a7b9d).
See [deployment evidence](research/cre-deployment.json).

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
Live revoked-key proof and compliant Cleanverse settlement remain outstanding.
