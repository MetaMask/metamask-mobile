# Google/Apple Login E2E Testing Strategy

## Overview

This document describes the E2E testing strategy for Google and Apple OAuth login flows in MetaMask Mobile.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        E2E Test Flow                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User taps "Continue with Google" button                         │
│                      │                                              │
│                      ▼                                              │
│  2. OAuthService.handleOAuthLogin() called (REAL)                   │
│                      │                                              │
│                      ▼                                              │
│  ┌──────────────────────────────────────────┐                       │
│  │  loginHandler.login() (MOCKED)            │                      │
│  │  ❌ Bypasses native OAuth UI              │                      │
│  │  ✅ Returns E2E email + mock code         │                      │
│  └──────────────────────────────────────────┘                       │
│                      │                                              │
│                      ▼                                              │
│  ┌──────────────────────────────────────────┐                       │
│  │  loginHandler.getAuthTokens() (REAL)      │                      │
│  │  Calls: Auth Server /api/v1/oauth/token   │                      │
│  │  ⚠️ Intercepted by Mockttp                │                      │
│  │  → Proxied to Backend QA Mock             │                      │
│  │  ✅ Returns VALID tokens                  │                      │
│  └──────────────────────────────────────────┘                       │
│                      │                                              │
│                      ▼                                              │
│  ┌──────────────────────────────────────────┐                       │
│  │  SeedlessOnboardingController.authenticate()                     │
│  │  ✅ REAL - Uses valid tokens from backend │                      │
│  │  ✅ Authenticates with TOPRF nodes        │                      │
│  │  ✅ Sets up controller state properly     │                      │
│  └──────────────────────────────────────────┘                       │
│                      │                                              │
│                      ▼                                              │
│  3. Navigation based on isNewUser                                   │
│     - New user → ChoosePassword → createToprfKeyAndBackupSeedPhrase │
│     - Existing user → AccountAlreadyExists → fetchAllSecretData     │
│                                                                     │
│  ✅ BOTH WORK because controller is properly authenticated!        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Components

### 1. Login Handler Mock (Module Replacement)

**File**: `e2e/module-mocking/oauth/OAuthLoginHandlers/index.ts`

**Metro Config**: Aliases `OAuthService/OAuthLoginHandlers` during E2E builds

```javascript
// metro.config.js
if (moduleName.endsWith('OAuthService/OAuthLoginHandlers')) {
  return {
    type: 'sourceFile',
    filePath: path.resolve(__dirname, 'e2e/module-mocking/oauth/OAuthLoginHandlers/index.ts'),
  };
}
```

**What it does**:
- `createLoginHandler()` returns mock handlers
- `login()` bypasses native OAuth UI, returns E2E email
- `getAuthTokens()` is REAL - calls Auth Server

### 2. Auth Server Proxy (Mockttp)

**File**: `e2e/api-mocking/seedless-onboarding/OAuthMockttpService.ts`

**What it does**:
- Intercepts `/api/v1/oauth/token` requests
- Proxies to Backend QA Mock endpoint
- Returns cryptographically valid tokens

```typescript
await server.forPost('/api/v1/oauth/token').thenCallback(async (request) => {
  // Proxy to backend QA mock
  const response = await fetch(AuthServer.MockRequestToken, {
    method: 'POST',
    body: requestBody,
  });
  return { statusCode: 200, json: await response.json() };
});
```

### 3. E2E Email Configuration

**File**: `e2e/module-mocking/oauth/OAuthService.ts`

**Usage**:
```typescript
beforeEach(() => {
  E2EOAuthHelpers.configureGoogleNewUser();
  // Email: google.newuser+e2e@web3auth.io
});
```

### 4. Backend QA Mock Endpoints

**Location**: Auth Server UAT environment

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/qa/mock/oauth/token` | Generate valid JWT tokens |
| `POST /api/v1/qa/mock/oauth/id_token` | Generate mock ID tokens |
| `POST /api/v2/qa/mock/oauth/renew_refresh_token` | Renew tokens |

**Email Pattern**: `/^[a-zA-Z0-9._-]+\+e2e@web3auth\.io$/`

## Test Scenarios

| Scenario | Email Pattern | Flow |
|----------|--------------|------|
| Google New User | `google.newuser+e2e@web3auth.io` | ChoosePassword → createToprfKeyAndBackupSeedPhrase |
| Google Existing User | `google.existinguser+e2e@web3auth.io` | AccountAlreadyExists → fetchAllSecretData |
| Apple New User | `apple.newuser+e2e@web3auth.io` | ChoosePassword → createToprfKeyAndBackupSeedPhrase |
| Apple Existing User | `apple.existinguser+e2e@web3auth.io` | AccountAlreadyExists → fetchAllSecretData |
| Error: Timeout | `error.timeout+e2e@web3auth.io` | Error handling |
| Error: Invalid | `error.invalid+e2e@web3auth.io` | Error handling |

## Files Modified/Created

### Module Mocking
- `e2e/module-mocking/oauth/OAuthLoginHandlers/index.ts` - Mock login handlers
- `e2e/module-mocking/oauth/OAuthService.ts` - E2EOAuthHelpers for configuration

### API Mocking
- `e2e/api-mocking/seedless-onboarding/OAuthMockttpService.ts` - Mockttp service
- `e2e/api-mocking/seedless-onboarding/constants.ts` - E2E email patterns

### Configuration
- `metro.config.js` - Module aliasing for E2E builds

### Test Specs
- `e2e/specs/seedless/google-login-new-user.spec.ts`
- `e2e/specs/seedless/google-login-existing-user.spec.ts`
- `e2e/specs/seedless/apple-login-new-user.spec.ts`
- `e2e/specs/seedless/apple-login-existing-user.spec.ts`

## Why This Works

1. **Native UI Bypass**: Mock login handlers skip Google/Apple sign-in UI
2. **Real Auth Flow**: `getAuthTokens()` and `authenticate()` are REAL
3. **Valid Tokens**: Backend QA mock uses SignerService for valid JWTs
4. **Proper Controller State**: SeedlessOnboardingController is authenticated
5. **TOPRF Works**: Valid tokens work with real TOPRF nodes
6. **Wallet Operations Work**: `createToprfKeyAndBackupSeedPhrase()` and `fetchAllSecretData()` succeed

## Prerequisites

1. Backend QA mock endpoints must be deployed to UAT
2. E2E build must use `IS_TEST=true` or `METAMASK_ENVIRONMENT=e2e`
3. Network access to UAT environment from test device

## Running Tests

```bash
# Build E2E app
yarn e2e:build:ios  # or e2e:build:android

# Run tests
yarn e2e:test:ios --spec=e2e/specs/seedless/google-login-new-user.spec.ts
```
