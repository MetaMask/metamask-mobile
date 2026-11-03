# Draft: MFA kit + W3A / social profile session

**Status:** draft for discussion with Accounts (Mathieu)  
**Branch:** `feat/mfa-kit-w3a-social-profile-session`

## Problem

Social rehydration Figma (“Wallet recovery / Verify it’s you”) needs to **list enrolled MFA factors before vault password**. Today `refreshEnrolledCredentials()` / kit verify go through AuthController paths that **assert wallet unlock** (HD seed → SRP profile session).

Himanshu’s note: a **profile session can also come from the W3A / social access token**.

## What AuthController already has

- `exchangeSocialAccessToken()` — reads Seedless social JWT (W3A), calls `POST /api/v2/social/login`, returns `{ token, profile }`. **No unlock.**

## What this draft adds (mobile Accounts kit)

| API                                                              | Role                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `establishSocialProfileSession()`                                | Wraps `exchangeSocialAccessToken` → `{ accessToken, profileId, … }` |
| `listEnrolledCredentialsWithAccessToken(accessToken)`            | `GET /api/v2/mfa/credentials` with that bearer                      |
| `listEnrolledCredentialsWithSocialSession()`                     | Compose both (pre-unlock factor list)                               |
| `useMfa()`                                                       | Exposes the above next to `verifyOrEnroll` / `enroll`               |
| `MfaControllerAdapter.listEnrolledCredentialsWithSocialSession?` | Optional adapter hook for clients                                   |

## Open questions for Mathieu / Accounts + core

1. Should **AuthController** own `listEnrolledCredentialsFromSocialSession()` (or accept an access token) instead of mobile fetching `/mfa/credentials` directly?
2. How should **kit verify** (`begin` / `complete` credential verification) run on a **social profile session** before unlock? SDK enroll helpers already take optional `accessToken` in places; verify paths still look SRP/unlock-centric.
3. Preferred kit API: separate `listEnrolledCredentialsWithSocialSession`, or `verifyOrEnroll({ session: 'social' })`?
4. After factor verify, how does this hand off to **MFA recovery controller** / seedless unlock for Password vs passkey/SMS/TOTP?

## Out of scope in this draft

- Custom “Verify it’s you” UI
- Wiring into `OAuthRehydration`
- Full pre-unlock `verifyOrEnroll` ceremony
- New-user Create Password MFA enroll
