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

## Credential-backed registration flow

The locally configured `CLEANVERSE_APP_ID` succeeds as the documented `api-id`
header: a fresh sandbox `is_register` read returned HTTP 200 / `0000` /
`registered: false`. The encryption key decodes to 32 bytes; unpadded Base64
is accepted without changing its decoded bytes. Credentials are not recorded here.

Connections (`/app/settings`) now includes an owner-only registration form.
Select **Any issuer** for the guide's documented empty/no-group-restriction rule,
or explicitly restrict eligibility to an actual two-letter issuer group. Select
the optional subgroup, minimum tier/sub-tier and country
rule, then choose **Sign & register account**. No group or tier is silently copied
from the API examples. No group/tier rules were supplied for this app, so no
registration write has been attempted yet. A specific issuer group must use the real, case-sensitive two-letter code;
no issuer code is needed when the owner explicitly chooses Any issuer. Minimum
tier 0 means no minimum-tier restriction in the validator guide. These choices
remain owner-selected rules, not proof that identities have been issued.

The server fixes the target to the official sandbox, encrypts using the documented
AES-256-CBC protocol, verifies the actual Confiance owner's EIP-191 signature,
checks both the API and official onchain registration state, and prevents concurrent
registration requests in this single-server runtime. It accepts no arbitrary pool,
chain, endpoint or agent signature. Unknown outcomes require checking registration
status before retrying. An API transaction hash is only provider-reported evidence;
verify its actual receipt before recording a deployment or issuance proof.

Restart the dev server if the new credentials were added after startup. Sign in
with the existing owner passkey and choose **Check registration**. Registration
acceptance is not a compliant-payment claim; CVI issuance, contractor enrollment,
aUSDC funding and actual eligible/ineligible transfers remain separate proofs.

Validation: 35 unit tests and strict TypeScript/production build pass, including
four registration tests for encryption compatibility, explicit rules, fixed
endpoint/secret handling and rejection of mismatched response accounts.

## Registration failure investigation

A subsequent read-only sandbox check still returned `0000` / `registered: false`.
The first registration modal discarded the response code, so its screenshot does
not establish whether owner authentication or the provider rejected the write.
Do not infer a missing role from that generic message.

The registration endpoint now distinguishes owner authentication, local signature
validation, invalid rules, provider signature/encryption rejection, explicit
role requirements, credential/IP rejection and service failures. Provider text is
classified into fixed messages; arbitrary responses and credentials are never
shown or logged. Recognized provider rejections save only public account, network,
timestamp, response code and reason in ignored `deployments/cleanverse-registration.json`.
The owner-only status check can retrieve that sanitized diagnostic. Another
registration attempt still requires an explicit owner signature; no retry runs
automatically. The modal's brand/status icons use actual CSS flex alignment rather
than undefined utility classes, and the misleading security-audit label is removed.

## Confirmed registration endpoint rejection

The owner supplied the actual signed request. Its signature independently verifies
against the configured owner for the documented message. The sandbox status query
returns HTTP 200 / `0000` / unregistered. A guarded submission of the exact approved
payload to `/api/cooperate/validator/register` returns **HTTP 403**, with a
**plain-text** response instead of the documented JSON envelope. A subsequent
guarded diagnostic reproduced this result. No alternative rule or signer was used.

The response includes Cloudflare ray **a49753fe3832ecea-LHR** but no challenge header.
A read-only GET of the registration route returns a normal JSON 405. These facts do
not establish the specific underlying role, IP allowlist or gateway rule responsible
for the POST rejection. Ask Cleanverse to inspect registration access for the
sandbox App ID and correlate the ray/request reference. Do not send the API key or
private signer material. See [sanitized evidence](research/cleanverse-registration-check.json).

The client now preserves non-JSON HTTP failures as typed, sanitized errors. The
app reports upstream failure as HTTP 502 with the provider HTTP status rather
than collapsing it into a generic 409. The response body is never shown or logged.
A regression test covers the exact HTML/non-JSON 403 class and secret-safe handling.
**37 unit tests**, strict types and the production build pass. Confiance remains
unenrolled; registration writes are not automatically retried.
