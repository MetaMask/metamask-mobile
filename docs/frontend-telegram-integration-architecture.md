# Frontend Telegram Integration Architecture

## Overview

Telegram login is now implemented as a backend-driven OAuth flow, not the older widget-in-WebView POC.

The current frontend flow is:

1. Mobile calls `POST /api/v2/telegram/login/initiate` on `authentication-api`
2. Backend returns `authorization_url` and `state`
3. Mobile opens `authorization_url` with `WebBrowser.openAuthSessionAsync(...)`
4. Telegram login completes and redirects back to the app callback URI
5. Mobile calls `POST /api/v2/telegram/login/verify` with `code`, `state`, and `code_verifier`
6. Backend returns a MetaMask OIDC `token`
7. Mobile calls `POST /api/v1/oauth/mint` on `auth-service`
8. `auth-service` returns the normal auth tokens used by onboarding

## Current Client Flow

```text
User taps "Continue with Telegram"
  -> TelegramLoginHandler generates PKCE values
  -> POST /api/v2/telegram/login/initiate
  -> openAuthSessionAsync(authorization_url, redirect_uri)
  -> app receives callback URL with code + state
  -> POST /api/v2/telegram/login/verify
  -> receive MetaMask OIDC token
  -> POST /api/v1/oauth/mint
  -> continue normal onboarding flow
```

## Platform Behavior

### iOS

- Uses `WebBrowser.openAuthSessionAsync(...)`
- Redirect URI is `metamask://oauth-redirect`
- Callback is received as a normal auth-session success URL
- No WebView is used

### Android

- Uses `WebBrowser.openAuthSessionAsync(...)`
- Redirect URI is the app OAuth redirect URL
- Behavior depends on browser and app-link handling
- No widget WebView is used in the current implementation

## Frontend Entry Points

Main files:

- `app/core/OAuthService/OAuthLoginHandlers/shared/TelegramLoginHandler.ts`
- `app/core/OAuthService/OAuthLoginHandlers/index.ts`
- `app/core/OAuthService/OAuthLoginHandlers/constants.ts`
- `app/components/Views/Onboarding/index.tsx`

## Backend Dependencies

Frontend depends on two backend systems:

### 1. authentication-api

Used for Telegram-specific OAuth handling:

- `POST /api/v2/telegram/login/initiate`
- `POST /api/v2/telegram/login/verify`

### 2. auth-service

Used for minting normal onboarding tokens:

- `POST /api/v1/oauth/mint`

## Request and Response Contract

### Initiate

Request:

```json
{
  "code_challenge": "<PKCE_CHALLENGE>",
  "app_redirect_uri": "<APP_CALLBACK_URI>"
}
```

Response:

```json
{
  "authorization_url": "https://oauth.telegram.org/auth?...",
  "state": "..."
}
```

### Callback

Expected callback URL shape:

```text
<redirect_uri>?code=...&state=...
```

Example iOS callback:

```text
metamask://oauth-redirect?code=...&state=...
```

### Verify

Request:

```json
{
  "code": "<AUTH_CODE>",
  "state": "<STATE>",
  "code_verifier": "<PKCE_CODE_VERIFIER>"
}
```

Response from `authentication-api`:

```json
{
  "token": "<METAMASK_OIDC_TOKEN>",
  "expires_in": 3600,
  "profile": {
    "identifier_type": "TELEGRAM"
  }
}
```

### Mint

Request to `auth-service`:

```json
{
  "id_token": "<METAMASK_OIDC_TOKEN>",
  "access_type": "offline"
}
```

Response:

- normal onboarding auth payload
- `id_token`
- `access_token`
- `metadata_access_token`
- optional refresh and revoke tokens

## Current Config

Frontend currently relies on:

- Telegram backend base URL
- initiate path
- verify path
- mint path
- app redirect URI per platform

The older widget-specific config such as `TELEGRAM_BOT_NAME` and hosted `telegram-login.html` is POC-era guidance and is not the active implementation path anymore.

## Security Notes

- PKCE is required
- `state` must match exactly on callback
- client should only trust backend-issued tokens after `/verify` and `/mint`
- Telegram provider data is not used directly as the final authenticated session
- No Telegram bot token or provider secret should exist in client code

## Known Issues / Risks

- Android callback behavior can be sensitive to browser and app-link handling
- `/api/v2/telegram/login/verify` must succeed before `/api/v1/oauth/mint` can run
- If backend callback shape changes, the mobile handler must stay aligned
- Debug logging and callback alerts used during development should be removed before production

## Notes on the Old POC

The earlier Telegram POC used:

- hosted `telegram-login.html`
- Telegram Login Widget
- WebView on iOS
- Chrome Custom Tabs plus page redirect on Android
- direct Telegram user payload parsing on the client

That is no longer the architecture this document describes.
