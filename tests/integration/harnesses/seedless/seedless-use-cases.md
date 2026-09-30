# Seedless onboarding use-case matrix

Seedless account-creation and add-secret failures, and which test layer proves each. Profile names match [ADR 0004](https://github.com/MetaMask/decisions/pull/291).

Layer notation: **U** = Unit, **I** = Integration (Shape A = controller harness). Primary layer is **bold**. Shared four-layer model: [`../../STRATEGY.md`](../../STRATEGY.md). Domain detail: [`STRATEGY.md`](STRATEGY.md).

Tests: [`app/core/Authentication/seedlessAccountCreation.integration.test.ts`](../../../../app/core/Authentication/seedlessAccountCreation.integration.test.ts)

---

## Account creation

| ADR 0004 profile                        | Use case                                             | U   | I     | End state checked                                                               |
| --------------------------------------- | ---------------------------------------------------- | --- | ----- | ------------------------------------------------------------------------------- |
| —                                       | Create the account, recover the SRP on a new install |     | **✓** | The SRP is recovered.                                                           |
| `create_metadata_set_fails`             | Metadata write fails                                 |     | **✓** | Sign-in again creates a new account. One namespace holds a secret.              |
| `create_key_shares_fail_after_metadata` | SRP written, key-share save fails                    |     | **✓** | Sign-in again creates a new account. A new install recovers only the retry SRP. |
| —                                       | Key-share save hits an expired token (incident 1745) |     | **✓** | **Current:** creation fails; the SRP stays under a key SSS never saved.         |
| —                                       | Sign in again after that failure                     |     | **✓** | Sign-in again creates a new account. A new install recovers the retry SRP.      |
| `create_vault_write_fails`              | Both remote writes done, local vault write fails     |     | **✓** | Sign-in again finds the existing user and recovers the SRP.                     |
| `after_create_key_shares`               | App killed after the key shares are saved            |     | **✓** | A fresh install finds the existing user and recovers the SRP.                   |

## Adding a secret

| ADR 0004 profile                | Use case                      | U   | I     | End state checked                                       |
| ------------------------------- | ----------------------------- | --- | ----- | ------------------------------------------------------- |
| `add_secret_metadata_set_fails` | Metadata write fails, retried |     | **✓** | The secret is stored once.                              |
| `add_secret_response_lost`      | Write lands, response lost    |     | **✓** | **Current:** the retry stores the secret a second time. |

Rows marked **Current** record today's behaviour, which differs from ADR 0004's expected end state. On an expired token, the controller repeats the SRP write that already landed, and the metadata store rejects a second primary SRP for the same key. When the controller skips that write, update the test to assert creation succeeds. When adding a secret stops writing the duplicate, update that test to assert one entry.
