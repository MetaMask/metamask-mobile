# Seedless onboarding use-case matrix

Seedless account-creation and add-secret failures, and which test layer proves each. Profile names and user scenarios match [ADR 0004](https://github.com/MetaMask/decisions/blob/main/decisions/onboarding/0004-seedless-password-change-chaos-stress-test-framework.md).

Layer notation: **U** = Unit, **I** = Integration (Shape A = controller harness). Primary layer is **bold**. Shared four-layer model: [`../../STRATEGY.md`](../../STRATEGY.md). Domain detail: [`STRATEGY.md`](STRATEGY.md).

Tests: [`app/core/Authentication/seedlessAccountCreation.integration.test.ts`](../../../../app/core/Authentication/seedlessAccountCreation.integration.test.ts)

---

## Account creation

| ADR 0004 profile                        | User scenario                                                                                                  | U   | I     | End state checked                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --- | ----- | ------------------------------------------------------------------------------- |
| —                                       | Creates a wallet, then signs in on a new install                                                               |     | **✓** | The SRP is recovered.                                                           |
| `create_metadata_set_fails`             | Creates a wallet and the network drops during the SRP backup                                                   |     | **✓** | Sign-in again creates a new account. One namespace holds a secret.              |
| `create_key_shares_fail_after_metadata` | Creates a wallet and the network drops or the app closes after the SRP backup, before the key shares are saved |     | **✓** | Sign-in again creates a new account. A new install recovers only the retry SRP. |
| —                                       | Creates a wallet and the auth token expires between the SRP backup and the key share save (incident 1745)      |     | **✓** | **Current:** creation fails; the SRP stays under a key SSS never saved.         |
| —                                       | Signs in again after that failure                                                                              |     | **✓** | Sign-in again creates a new account. A new install recovers the retry SRP.      |
| `create_vault_write_fails`              | Creates a wallet and the app fails after both remote writes, before the local vault is created                 |     | **✓** | Sign-in again finds the existing user and recovers the SRP.                     |
| `after_create_key_shares`               | Creates a wallet and closes the app after the key shares are saved                                             |     | **✓** | A fresh install finds the existing user and recovers the SRP.                   |

## Adding a secret

Each row runs for an imported SRP and an imported private key.

| ADR 0004 profile                | User scenario                                                                                         | U   | I     | End state checked                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | --- | ----- | ------------------------------------------------------- |
| `add_secret_metadata_set_fails` | Imports an SRP or private key and the network drops                                                   |     | **✓** | The secret is stored once.                              |
| `add_secret_response_lost`      | Imports an SRP or private key, and the request times out or the app closes after the server stored it |     | **✓** | **Current:** the retry stores the secret a second time. |

Rows marked **Current** record today's behaviour, which differs from ADR 0004's expected end state. On an expired token, the controller repeats the SRP write that already landed, and the metadata store rejects a second primary SRP for the same key. When the controller skips that write, update the test to assert creation succeeds. When adding a secret stops writing the duplicate, update that test to assert one entry.
