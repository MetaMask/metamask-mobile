# Seedless onboarding integration strategy

Domain detail for **seedless onboarding** (social login). Shared four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case → layer assignments live in [`seedless-use-cases.md`](seedless-use-cases.md).

## TL;DR

Integration for seedless proves what state a failed account creation or secret upload leaves behind, through the real `SeedlessOnboardingController` and Mobile's vault encryptor adapter. The TOPRF client is replaced by an in-memory SSS and metadata store, so a test can fail one write, repeat the step the way Mobile does, and check whether a new install recovers the SRP. Shape A only.

These tests follow [ADR 0004](https://github.com/MetaMask/decisions/pull/291). They check the end state after a fault and a retry, because the controller does not record checkpoints for account creation or adding a secret yet.

## Seedless integration harness shapes

| Layer of the stack                          | Shape A: controller + fake backend   | Future Shape B: app flow               |
| ------------------------------------------- | ------------------------------------ | -------------------------------------- |
| `@metamask/seedless-onboarding-controller`  | ✓                                    | ✓                                      |
| Mobile `seedlessOnboardingEncryptorAdapter` | ✓                                    | ✓                                      |
| TOPRF client (SSS nodes, metadata store)    | in-memory fake                       | in-memory fake                         |
| Auth-server token callbacks                 | mocked                               | mocked                                 |
| `Authentication.createAndBackupSeedPhrase`  | ✗ — its failure path is reproduced   | ✓                                      |
| `KeyringController`, Redux, keychain        | ✗                                    | ✓ / mocked                             |
| Best for                                    | Key chains, recovery, duplicate data | Temporary-wallet swap, backup clearing |

Shape A reproduces Mobile's failure path explicitly: after a create step fails, the test calls `clearState()` and signs in again, which is what `Authentication.createAndBackupSeedPhrase` does in its catch block. Add Shape B when the app-side steps (temporary wallet, vault backup clearing, `AuthenticationController` reset) are part of the risk.

## Harness inventory

When the harness boundary changes, update this section. Authoring workflow: [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md). Shared agent index: [`../../AGENTS.md`](../../AGENTS.md).

### Seedless — [`seedless.ts`](seedless.ts)

- **Shape:** A — controller-level harness
- **Real:** `SeedlessOnboardingController` (controller lock, token-refresh retry, vault creation, backup-metadata state), Mobile's `seedlessOnboardingEncryptorAdapter`
- **Mocked:** TOPRF client methods (`authenticate`, `createLocalKey`, `addSecretDataItem`, `persistLocalKey`, `recoverEncKey`, `fetchAllSecretDataItems`, `fetchAuthPubKey`) backed by `FakeToprfBackend`; auth-server `refreshJWTToken` / `revokeRefreshToken` / `renewRefreshToken`
- **Factory:** `buildSeedlessIntegrationHarness()`
- **Returns:** `{ backend, newInstall }`. Each `newInstall()` returns `{ controller, signIn }` sharing one backend.
- **Fault helpers:** `failNextCall(install, method, error?)` fails before the write; `loseNextResponse(install, method)` commits the write, then throws; `authTokenExpiredError()` builds the error that makes the controller refresh tokens and repeat the step.
- **Use when:** checking what a failed seedless write leaves in SSS and the metadata store, and whether a new install recovers the SRP.

`FakeToprfBackend` keeps one saved key per user and stores secret items per auth public key. An SRP written under one key cannot be read by an install that recovers a different key, which is how a key split shows up. Like the metadata store, it rejects a second primary SRP under the same key; other secret types can repeat.
