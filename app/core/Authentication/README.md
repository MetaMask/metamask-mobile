# Authentication Service

The `Authentication` service is a centralized authentication system for MetaMask Mobile that handles wallet creation, login, password management, and authentication preferences. It provides a unified interface for managing user authentication across different flows including traditional SRP (Secret Recovery Phrase) wallets and seedless (OAuth) wallets.

## Overview

The Authentication service manages:

- Wallet creation and restoration
- User login (password, biometric, passcode, remember me)
- Password storage and retrieval from secure keychain
- Authentication preference management
- Seedless wallet flows (OAuth-based wallets)
- Account import and discovery
- Wallet deletion and reset

## Core Concepts

### Authentication Types

The service supports multiple authentication types defined in `AUTHENTICATION_TYPE`:

- **PASSWORD**: Traditional password-based authentication
- **BIOMETRIC**: Biometric authentication (Face ID, Touch ID, etc.)
- **PASSCODE**: Device passcode-based authentication
- **REMEMBER_ME**: Persistent authentication that doesn't require re-entry
- **UNKNOWN**: Default state before authentication is configured

### AuthData Interface

```typescript
interface AuthData {
  currentAuthType: AUTHENTICATION_TYPE;
  availableBiometryType?: BIOMETRY_TYPE;
  oauth2Login?: boolean;
}
```

## Public API

### `deleteWallet`

Deletes the wallet by resetting wallet state and deleting user data. This is the main public method for wallet deletion/reset flows.

```typescript
await Authentication.deleteWallet(): Promise<void>
```

**Example Usage:**

```typescript
// From app/components/UI/DeleteWalletModal/index.tsx
await Authentication.deleteWallet();

// From app/components/hooks/SeedlessHooks/usePromptSeedlessRelogin.ts
await Authentication.deleteWallet();
```

**What it does:**

- Resets wallet state by creating a temporary wallet and clearing all related state
- Deletes user data by setting `existingUser` to `false` and creating a data deletion task
- Clears metrics opt-in UI state (`OPTIN_META_METRICS_UI_SEEN`)
- Resets onboarding completion status
- Locks the app and navigates to onboarding

**Implementation Details:**

- Calls `resetWalletState()` which:
  - Clears all vault backups before creating temporary wallet
  - Disables automatic vault backups during reset (prevents temporary wallet from being backed up)
  - Creates a new wallet with timestamp-based password
  - Clears SeedlessOnboardingController state
  - Resets deposit provider tokens
  - Resets RewardsController
  - Locks app without navigating to login
  - Always re-enables automatic vault backups, even on error
- Calls `deleteUser()` which:
  - Sets `existingUser` to `false` in Redux
  - Creates MetaMetrics data deletion task

**Note:** This is a destructive operation that cannot be undone. All wallet data, accounts, and settings will be permanently deleted.

---

### `updateAuthPreference`

Updates the user's authentication preference (biometric, passcode, or password). Validates the password before updating and manages all related storage flags. Used for authentication preference management.

```typescript
await Authentication.updateAuthPreference(options: {
  authType: AUTHENTICATION_TYPE;
  password?: string;
}): Promise<void>
```

**Example Usage:**

```typescript
// From app/components/Views/Settings/SecuritySettings/Sections/LoginOptionsSettings.tsx
await Authentication.updateAuthPreference({
  authType: AUTHENTICATION_TYPE.BIOMETRIC,
});

// From app/components/UI/TurnOffRememberMeModal/TurnOffRememberMeModal.tsx
await Authentication.updateAuthPreference({
  authType: authTypeToRestore,
  password: passwordText,
});

// From app/components/Views/Settings/SecuritySettings/Sections/RememberMeOptionSection.tsx
await Authentication.updateAuthPreference({
  authType: AUTHENTICATION_TYPE.REMEMBER_ME,
  password: enteredPassword,
});
```

**Parameters:**

- `authType`: Type of authentication to use (`BIOMETRIC`, `PASSCODE`, or `PASSWORD`)
- `password`: Optional password to use. If not provided, attempts to retrieve from keychain

**What it does:**

1. Reauthenticates with provided password or retrieves from keychain via `reauthenticate()`
2. Resets current password in keychain
3. Stores password with new auth type via `storePassword()`
4. Manages storage flags (`BIOMETRY_CHOICE_DISABLED`, `PASSCODE_DISABLED`) based on auth type

**Error Handling:**

- If password is not found in keychain and not provided, throws `AuthenticationError` with `AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS`
- If error message includes `PASSWORD_NOT_SET_WITH_BIOMETRICS`, converts to `AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS` for UI handling
- If password is invalid, shows alert dialog and tracks analytics error
- Other errors are logged and re-thrown

**Throws:**

- `AuthenticationError` when password is not found and not provided (callers should handle navigation to password entry screen)
- Other errors from password verification or storage

---

### `reauthenticate`

Verifies a password. If no password is provided, attempts to use stored biometric/remember-me password from keychain. Used for password verification before sensitive operations.

```typescript
await Authentication.reauthenticate(
  password?: string
): Promise<{ password: string }>
```

**Example Usage:**

```typescript
// From app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
const { password: verifiedPassword } = await reauthenticate();

// Used internally by updateAuthPreference
const passwordToUse = await this.reauthenticate(password);
```

**Parameters:**

- `password`: Optional password to verify. When omitted, attempts to retrieve from keychain

**What it does:**

1. If password is provided: Verifies it directly with `KeyringController.verifyPassword()`
2. If no password provided:
   - Attempts to retrieve stored credentials from keychain via `getPassword()`
   - If retrieval fails, throws error with `ReauthenticateErrorType.BIOMETRIC_ERROR`
   - If no credentials found, throws error with `ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS`
   - Verifies retrieved password with `KeyringController.verifyPassword()`
3. Returns verified password on success

**Returns:** Object with `password` property containing the verified password string

**Throws:**

- Error with `ReauthenticateErrorType.BIOMETRIC_ERROR` prefix if biometric retrieval fails (e.g., "User canceled the operation")
- Error with `ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS` prefix if no password stored with biometrics
- Propagates errors from `KeyringController.verifyPassword()` (e.g., "Invalid password")

**Note:**

- When biometrics is canceled or fails, `getPassword()` throws "User canceled the operation"
- Disallowing biometrics on system level returns empty credentials without throwing
- Future improvement: May want to triage errors and throw different error types based on error category

---

### `revealSRP`

Reveals the secret recovery phrase (SRP) for a specified keyring after verifying the provided password. Used for credential revelation.

```typescript
await Authentication.revealSRP(
  password: string,
  keyringId?: string
): Promise<string>
```

**Example Usage:**

```typescript
// From app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
const { password: verifiedPassword } = await reauthenticate();
privateCredential = await revealSRP(verifiedPassword, keyringId);
```

**Parameters:**

- `password`: Password used to authenticate the user
- `keyringId`: Optional keyring identifier. If not provided, uses primary keyring

**What it does:**

1. Verifies password via `reauthenticate()`
2. Exports seed phrase from `KeyringController.exportSeedPhrase()`
3. Converts raw seed phrase (Uint8Array) to mnemonic string using wordlist

**Returns:** Mnemonic seed phrase as string (space-separated words)

**Throws:** Errors from `reauthenticate()` or `KeyringController.exportSeedPhrase()`

---

### `revealPrivateKey`

Reveals the private key for a given account address after verifying the provided password. Used for credential revelation.

```typescript
await Authentication.revealPrivateKey(
  password: string,
  address: string
): Promise<string>
```

**Example Usage:**

```typescript
// From app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
const { password: verifiedPassword } = await reauthenticate();
privateCredential = await revealPrivateKey(verifiedPassword, selectedAddress);
```

**Parameters:**

- `password`: Password used to authenticate the user
- `address`: Account address whose private key will be exported

**What it does:**

1. Verifies password via `reauthenticate()`
2. Exports private key from `KeyringController.exportAccount()`

**Returns:** Hex-encoded private key string (with 0x prefix)

**Throws:** Errors from `reauthenticate()` or `KeyringController.exportAccount()`

---

## Error Handling

The Authentication service uses `AuthenticationError` for consistent error handling:

```typescript
throw new AuthenticationError(
  message: string,
  customErrorMessage: string,
  authData: AuthData
);
```

Common error constants:

- `AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS` - No password found in keychain
- `AUTHENTICATION_STORE_PASSWORD_FAILED` - Failed to store password
- `AUTHENTICATION_RESET_PASSWORD_FAILED` - Failed to reset password

Reauthenticate error types:

- `ReauthenticateErrorType.BIOMETRIC_ERROR` - Biometric retrieval failed
- `ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS` - No password stored with biometrics

## Usage Patterns

### React Hook

For React components, use the `useAuthentication` hook:

```typescript
import { useAuthentication } from '../../core/Authentication/hooks/useAuthentication';

const { reauthenticate, revealSRP, revealPrivateKey } = useAuthentication();
```

### Direct Import

For non-React code or when you need access to all methods:

```typescript
import { Authentication } from '../../core/Authentication';

await Authentication.deleteWallet();
await Authentication.updateAuthPreference({
  authType: AUTHENTICATION_TYPE.BIOMETRIC,
});
```

## Best Practices

1. **Always handle errors**: Authentication methods throw errors that should be caught and handled appropriately
2. **Password security**: Passwords are automatically wiped from memory after use
3. **Wallet deletion**: `deleteWallet()` is destructive - ensure user confirmation before calling
4. **Auth preference updates**: Use `updateAuthPreference()` when changing authentication methods - it handles all storage flag management
5. **Password verification**: Use `reauthenticate()` before sensitive operations - it supports both direct password and biometric/remember-me retrieval
6. **Credential revelation**: Always verify password before revealing SRP or private keys - both `revealSRP()` and `revealPrivateKey()` do this automatically

## Related Files

- `Authentication.ts` - Main service implementation
- `AuthenticationError.ts` - Error class for authentication errors
- `types.ts` - TypeScript types and interfaces (includes `ReauthenticateErrorType`)
- `hooks/useAuthentication.ts` - React hook wrapper
- `../../constants/userProperties` - Authentication type constants
- `../../constants/error` - Error message constants
