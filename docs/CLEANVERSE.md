# Cleanverse investigation — 12 October 2026

The supplied invitation code opened the official developer documentation. The
supplied developer API ID successfully queried the sandbox Validator endpoint:
`POST https://uatapi.cleanverse.com/api/cooperate/validator/is_register` returned
HTTP 200, code `0000`, and `registered: false` for the deployed Confiance account.
The request used the documented `api-id` header and plain JSON. No encryption
key, invitation code, account registration, or personal information is published.

## Confirmed interfaces and network

The official [supported-chain directory](https://docs.cleanverse.com/get-started/supported-chains)
lists Monad testnet CVI Validator
`0xA64529732B52EFFD2B245320E88226D72c23b788`. Code presence was checked on chain 10143. Its documented `isRegistered(address)` returned false for Confiance
`0x952bbdDeCE639f678733F310890d15E28b213489`. A subsequent
`complianceVerify(address,address)` call reverted; no eligibility was inferred.

The documented aUSDC is `0xaC0893567D43C3E7e6e35a72803df05416C1f20D`.
Its actual `policy()` getter returned the directory's policy
`0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`. A transfer-policy read did not
produce an eligibility result. No aUSDC transfer or funding was attempted.

The [CVI Validator V2 guide](https://drive.google.com/file/d/19QZdU0q06AoJiM_HDe9TDGsZZKhiRVKU/view)
documents contract-vault CVI registration through an authorized factory's
`registerApass(pool, token, fee)` call. It also defines the read-only methods
`isRegistered(pool)` and `complianceVerify(pool, user)`. The
[Wrapped CVA guide](https://drive.google.com/file/d/1Zi4i5pp5swIP52PvglHJRveuFA_L81VC/view)
and [CVA guide](https://drive.google.com/file/d/1ZXDADg2z5EHhG_TIuJfPEQrZLQjpCD_E/view)
describe token-level `policy.canTransfer(token, from, to, amount)` enforcement.
These documents establish a contract-vault integration route; they do not prove
the deployed Confiance account is enrolled or can transfer the current aUSDC.

## Implemented boundary

`contracts/src/CleanverseValidatorAdapter.sol` uses the documented read ABI.
It pins one account, validator, CVA, and policy. The constructor rejects missing
code, a mismatched token policy, and an unregistered account. Reads require
current registration, the account's CVI eligibility, and the recipient's CVI
eligibility. Validator failure reverts. The adapter cannot mutate rules,
register identities, sign, approve, hold, or transfer treasury funds.

Ten local fixture tests cover passing checks, wrong assets, ineligible recipients
and treasury, lost enrollment, validator failure, policy changes, and rejected
deployment configurations. These tests are not live Cleanverse compliance proof.
The adapter has not been deployed or enabled in the current CTT session.

## Remaining steps

1. Confirm the sandbox developer account's Issue Member role and the correct CVI
   group/tier rules with Cleanverse. A successful read does not prove write access.
2. Register Confiance using the documented encrypted
   [pool-registration endpoint](https://docs.cleanverse.com/api/validator/validator-register).
   The human owner signs the EIP-191 message formed by lowercase `monad` plus the
   lowercase Confiance address, with no separator. Do not use the agent signer.
3. Obtain the documented contract-vault CVI registration for this existing
   account. Pool registration alone is not proof of CVI issuance. Establish the
   authorized factory/operator path; do not grant the agent registrar privileges.
4. Enroll the contractor's actual wallet, and verify both sides onchain under
   the intended rules. Use legitimate sandbox identity information and follow
   Cleanverse's test-identity procedure; do not fabricate company records.
5. Obtain sandbox aUSDC, fund Confiance, then prove an exact ERC-20 transfer from
   Confiance to the eligible contractor. Confirm the ineligible-recipient case
   really reverts. Check token accounting and real receipts.
6. Only then deploy the adapter and have the owner authorize a new aUSDC session.
   The current CTT session cannot silently change its allowed asset or reset its
   spending. Record all enrollment, adapter, and payment receipts.

The API encryption specification requires AES-256-CBC, PKCS padding, and a fixed
zero IV with the base64-decoded API key. Implement that only on the server, per
the official [encryption reference](https://docs.cleanverse.com/api/encryption).
No API response substitutes for onchain payment authorization.
