# User toggle for MFA on MPC signing

Users can turn off MFA for MPC signing so that starting an MPC signing session no longer asks them for a second factor. Turning the switch either way needs a 2FA token. This ADR compares two ways to build it:

- **Option A, server preference:** the MPC service stores the switch and accepts a 1FA token for signing while it is off.
- **Option B, derived SIWE factor:** turning the switch off enrolls a wallet-derived key as a SIWE credential. While the switch is off, the client signs in with that key to get a 2FA token, so the MPC service always sees 2FA.

Status: proposed, 2026-10-08 ([MFA-499](https://consensyssoftware.atlassian.net/browse/MFA-499)). Parent: [MFA-309 Architecture scoping](https://consensyssoftware.atlassian.net/browse/MFA-309). Product name: **Disable 2FA**. Choice between A and B pending.

## Terms

- **1FA token**: the profile access token from the base sign-in (`AuthenticationController`).
- **2FA token**: a verification token from the MFA kit (`verifyOrEnroll`).
- **User factor**: an email OTP or passkey credential that the user controls separately from the wallet.
- **Switch**: the user's Disable 2FA setting for MPC signing.

## Requirements (both options)

1. **Turning the switch off needs a 2FA token** proven with a user factor. Anyone holding only a 1FA session must not be able to remove the second factor.
2. **Turning the switch back on also needs a 2FA token** proven with a user factor. Users who no longer have access to their email or passkey must not be able to turn 2FA back on. Otherwise they would lock themselves out of MPC signing.
3. **The switch never removes enrolled user factors.** Turning it back on reuses the user's existing email or passkey.
4. **Signing checks the switch in one shared helper** that every MPC signing call site uses.

## Option A: server preference on `/v2/mpc-mfa-enabled`

The MPC service stores the switch and lowers its own signing requirement while the switch is off.

| Request                    | Effect on later MPC signing | Token required |
| -------------------------- | --------------------------- | -------------- |
| `GET`                      | None; returns the switch    | 1FA token      |
| `POST { "enable": false }` | 1FA token is enough         | 2FA token      |
| `POST { "enable": true }`  | 2FA token required          | 2FA token      |

Proposed GET response: `{ "enabled": boolean }`. The GET needs only 1FA because the client must read the switch before it knows whether to ask for 2FA.

**Changing the switch:** call `verifyOrEnroll` with a user factor, then POST with the 2FA token. Update the UI only after the server confirms the change.

**Signing:**

- Read the switch from the GET, or reuse the value from a recent GET or a successful POST. Clear the value on lock, sign-out, and wallet reset.
- Switch on: get a 2FA token through `verifyOrEnroll`, then start MPC signing.
- Switch off: start MPC signing with the 1FA token. Do not prompt.
- Switch unknown: treat it as on. A wrong guess costs one prompt instead of a rejected request.

**Changes needed:** the MPC service needs the GET, the `enable` field on the POST, and a 1FA signing path gated on the stored switch.

## Option B: derived key enrolled as a SIWE factor

The MPC service keeps requiring 2FA for every signing request. The switch only decides whether the client can produce that 2FA token without user interaction.

**Turning the switch off:**

1. Call `verifyOrEnroll` with a user factor to get a 2FA token. Enrolling another credential needs a recent 2FA session anyway.
2. Derive a dedicated private key from the wallet's SRP. Use a derivation path reserved for this purpose, separate from the existing auth and user-storage signing keys.
3. Enroll the derived key's address as a SIWE credential with the authentication server.

**Signing:**

- Switch on (no SIWE credential enrolled): get a 2FA token through `verifyOrEnroll`, which prompts for a user factor unless a verification session is live.
- Switch off (SIWE credential enrolled): sign a SIWE challenge with the derived key and complete verification without any UI, then start MPC signing with the resulting 2FA token.

**Turning the switch back on:** call `verifyOrEnroll` restricted to user factors (`email_otp`, `passkey`), then remove the SIWE credential with that 2FA token. The SIWE credential must not be allowed to authorize its own removal. Otherwise turning the switch back on would not prove the user can still use a real second factor.

**Reading the switch:** a SIWE credential in the profile's enrolled credentials means the switch is off. No separate status endpoint is needed.

**Changes needed:**

- Authentication server: a `siwe` MFA credential type, with enroll, verify, and remove flows. Removal must accept only a user factor.
- `@metamask/profile-sync-controller`: support for the new credential type in `beginCredentialEnrollment`, `beginCredentialVerification`, and the matching complete methods.
- Clients: key derivation through the keyring, plus a non-interactive SIWE verification step in the signing helper.
- MPC service: none.

## Comparison

| Concern                         | Option A: server preference                         | Option B: derived SIWE factor                                                     |
| ------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| MPC service policy              | Two paths, 1FA and 2FA, chosen by stored preference | Always 2FA                                                                        |
| Where the switch lives          | MPC service                                         | Presence of the SIWE credential in the authentication server                      |
| Backend work                    | MPC service: GET, POST field, 1FA signing path      | Authentication server: new credential type; controller update                     |
| Security while off              | Profile session only                                | Possession of the SRP, which every device holding the wallet already has          |
| Other devices with the same SRP | Follow the stored preference                        | Derive the same key, so the factor works without re-enrolling                     |
| Other 2FA-gated features        | Unaffected; they still prompt                       | The SIWE factor could satisfy them too unless the server limits it to MPC signing |
| Client complexity               | Read the switch, choose a token                     | Key derivation, SIWE signing, credential management                               |

## Consequences

- With either option, while the switch is off, MPC signing is protected only by what is already on the device. The disable copy has to make that clear.
- Requiring 2FA to turn the switch back on means a user who has lost their email or passkey must recover it before re-enabling. That is intended: it stops them enabling a protection they can no longer satisfy.
- Mobile and extension need the same flows and `operation` names. Use `money.mpc_mfa.disable` and `money.mpc_mfa.enable` as `reason.operation` for the verification step when changing the switch.

## Follow-up work

1. Choose Option A or B.
2. Backend work for the chosen option, as listed under its changes.
3. Client API and the shared signing helper.
4. Settings UI: the Disable 2FA switch, with a warning before disabling.
5. Extension parity.

## Open questions

1. **Both options:** what is the default for existing users before they change the switch? This ADR assumes on.
2. **Option A:** is the GET response `{ "enabled": boolean }`? Which error code means the token level is too low?
3. **Option A:** does the MPC service accept the 2FA verification token on its own, or alongside the 1FA access token?
4. **Option B:** can the authentication server scope a SIWE credential to MPC signing only, so it cannot satisfy other 2FA-gated features?
5. **Option B:** which derivation path should the dedicated key use, and how does that work for social-login (seedless) wallets?
6. **Option B:** does the server reject a SIWE-proven token when the SIWE credential is being removed?

## References

- MFA kit (mobile): `app/util/identity/mfa/` on `feat/mfa-shadow-mode`
- `VerificationToken`, `TokenReason`, `MFA_CREDENTIAL_TYPES`: `@metamask/profile-sync-controller/sdk`
