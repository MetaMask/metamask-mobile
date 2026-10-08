# User toggle for MFA on MPC signing

Users can turn off MFA for MPC signing, which lowers the requirement to start an MPC signing session from 2FA to 1FA. The MPC service stores the preference. Clients read it with `GET /v2/mpc-mfa-enabled` using a 1FA token, and the user changes it through `POST /v2/mpc-mfa-enabled` with `{ "enable": boolean }`. Changing it is deliberately asymmetric: turning MFA off needs a 2FA token, while turning it back on needs only a 1FA token. Weakening protection therefore takes the stronger proof, and restoring it is cheap.

Status: proposed, 2026-10-08 ([MFA-499](https://consensyssoftware.atlassian.net/browse/MFA-499)). Parent: [MFA-309 Architecture scoping](https://consensyssoftware.atlassian.net/browse/MFA-309). Product name: **Disable 2FA**.

## Terms

- **1FA token**: the profile access token from the base sign-in (`AuthenticationController`).
- **2FA token**: a verification token from the MFA kit (`verifyOrEnroll`), proven with an enrolled email OTP or passkey credential.
- **MPC MFA enabled**: the per-user preference held by the MPC service. When on, starting MPC signing needs a 2FA token. When off, a 1FA token is enough.

## Decision

### MPC service contract

#### Read the setting

`GET /v2/mpc-mfa-enabled` returns the user's current setting. It needs only a 1FA token, because reading the setting changes nothing and clients must be able to check it before deciding whether to ask for 2FA.

Proposed response:

```json
{ "enabled": boolean }
```

#### Change the setting

The MPC service extends `POST /v2/mpc-mfa-enabled` to accept:

```json
{ "enable": boolean }
```

| `enable` | Effect on later MPC signing | Token required for this request |
| -------- | --------------------------- | ------------------------------- |
| `false`  | 1FA token is enough         | 2FA token                       |
| `true`   | 2FA token required          | 1FA token                       |

The server enforces both rules: the token level on this request, and the level required when starting MPC signing. A client cannot lower the signing requirement by itself.

### Client: showing the setting

Settings calls `GET /v2/mpc-mfa-enabled` with the 1FA token to show the current state. If the request fails, show an error state with a retry rather than guessing the value in the toggle.

### Client: changing the setting

1. To disable, call `verifyOrEnroll`. It verifies an enrolled credential, or enrolls one first if none exists, and returns a 2FA token. Send `{ "enable": false }` with that token.
2. To enable, send `{ "enable": true }` with the 1FA token. No MFA prompt.
3. Update the displayed setting only after the server confirms the change.
4. Before disabling, show copy that explains that signing will then need only 1FA.

Use `money.mpc_mfa.disable` as the `reason.operation` for the verification step, so traces show why the user was asked to verify.

### Client: starting MPC signing

Read the setting with `GET /v2/mpc-mfa-enabled` (1FA token), or reuse the value from a recent GET or a successful POST. Clear that value on lock, sign-out, and wallet reset.

- If MPC MFA is enabled, get a 2FA token through `verifyOrEnroll` before starting MPC signing. A live verification session is reused without prompting.
- If MPC MFA is disabled, start MPC signing with the 1FA token and do not prompt for MFA.
- If the GET fails and there is no recent value, assume MPC MFA is enabled. A wrong guess then costs one extra prompt rather than a rejected signing request.

Keep this check in one shared helper that every MPC signing call site uses, rather than repeating it per flow.

### Rejected alternatives

| Option                                             | Why rejected                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Store the preference on the client only            | The MPC service would still require 2FA, so signing would not get easier.                                     |
| Require the same token level to enable and disable | Disabling would be no harder than enabling, so anyone holding a 1FA session could remove the 2FA requirement. |

## Consequences

- While MPC MFA is off, MPC signing is protected only by 1FA. That is the user's choice, and the disable copy has to make it clear.
- Enrolled MFA credentials are unaffected by the toggle. A user who turns MPC MFA back on can verify with their existing credentials.
- Mobile and extension need the same flows and `operation` names.

## Follow-up work

1. MPC service: add `GET /v2/mpc-mfa-enabled` (1FA), accept `enable` on `POST /v2/mpc-mfa-enabled`, and enforce the token levels above.
2. Client API: call both endpoints and expose the current setting.
3. Settings UI: a Disable 2FA / enable toggle with the disable warning.
4. Signing: the shared helper that picks a 1FA or 2FA token before starting MPC signing.
5. Extension: the same behavior.

## Open questions

1. Is the GET response `{ "enabled": boolean }`, or a different shape?
2. What does the POST return on success, and which error code means the token level is too low?
3. What is the default for existing users before they change the setting? This ADR assumes enabled.
4. Does the MPC service accept the 2FA verification token on its own, or alongside the 1FA access token?

## References

- MFA kit (mobile): `app/util/identity/mfa/` on `feat/mfa-shadow-mode`
- `VerificationToken`, `TokenReason`: `@metamask/profile-sync-controller/sdk`
