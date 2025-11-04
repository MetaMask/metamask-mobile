# Vault Recovery Fix - Changes to Reapply

## Summary
This document lists all changes made for the vault recovery feature. Use this to recreate the branch cleanly from main.

---

## Modified Files (8 files)

### 1. `app/components/Views/Onboarding/index.js`
**Purpose:** Detect migration failures and trigger vault recovery

**Key Changes:**
- Added `hasCheckedVaultBackup` instance variable (line 288)
- Added `checkForMigrationFailureAndVaultBackup()` method (lines 360-399)
- Call check in `componentDidMount()` (after line 347)
- Skip detection if `route.params.delete` is set (intentional wallet reset)
- Navigate to vault recovery screen if: `!existingUser` && vault backup exists

**Code Additions:**
```javascript
// Instance variable (around line 288)
hasCheckedVaultBackup = false;

// Method (around line 360)
async checkForMigrationFailureAndVaultBackup() {
  if (this.hasCheckedVaultBackup) {
    return;
  }
  
  this.hasCheckedVaultBackup = true;
  
  // Skip check if this is an intentional wallet reset
  if (this.props.route?.params?.delete) {
    return;
  }
  
  const { existingUser } = this.props;
  
  try {
    const vaultBackupResult = await getVaultFromBackup();
    
    // Detect migration failure scenario
    const migrationFailureDetected = !existingUser && vaultBackupResult.success && vaultBackupResult.vault;
    
    if (migrationFailureDetected) {
      // Navigate to vault recovery screen
      this.props.navigation.reset({
        routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
      });
    }
  } catch (error) {
    Logger.error(error, 'Failed to check for migration failure and vault backup');
  }
}

// In componentDidMount (after line 347)
await this.checkForMigrationFailureAndVaultBackup();
```

---

### 2. `app/components/hooks/DeleteWallet/useDeleteWallet.ts`
**Purpose:** Prevent temporary wallets from being backed up during deletion

**Key Changes:**
- Import `EngineClass` from Engine
- Clear vault backups BEFORE creating temp wallet
- Set `disableAutomaticVaultBackup = true` before temp wallet creation
- Reset flag in `finally` block to ensure cleanup

**Complete modified `resetWalletState` function:**
```typescript
const resetWalletState = useCallback(async () => {
  try {
    // Clear vault backups BEFORE creating temporary wallet
    await clearAllVaultBackups();
    
    // CRITICAL: Disable automatic vault backups during wallet RESET
    // This prevents the temporary wallet (created during reset) from being backed up
    EngineClass.disableAutomaticVaultBackup = true;
    
    try {
      await Authentication.newWalletAndKeychain(`${Date.now()}`, {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });

      Engine.context.SeedlessOnboardingController.clearState();

      await depositResetProviderToken();

      await Engine.controllerMessenger.call('RewardsController:resetAll');
      
      // Lock the app and navigate to onboarding
      await Authentication.lockApp({ navigateToLogin: false });
    } finally {
      // ALWAYS re-enable automatic vault backups, even if error occurs
      EngineClass.disableAutomaticVaultBackup = false;
    }
  } catch (error) {
    const errorMsg = `Failed to createNewVaultAndKeychain: ${error}`;
    Logger.log(error, errorMsg);
  }
}, []);
```

**Import change:**
```typescript
import { Engine as EngineClass } from '../../../core/Engine/Engine';
```

---

### 3. `app/core/Authentication/Authentication.ts`
**Purpose:** Prevent temporary wallets from being backed up during OAuth error recovery

**Key Changes:**
- Same pattern as useDeleteWallet
- Applied in `createAndBackupSeedPhrase()` catch block (around line 765)

**Code to add in catch block (line 765-785):**
```typescript
} catch (error) {
  const { Engine: EngineClass } = await import('../Engine/Engine');
  
  // Clear vault backups BEFORE creating temporary wallet
  await clearAllVaultBackups();
  
  // Disable automatic vault backups during OAuth error recovery
  EngineClass.disableAutomaticVaultBackup = true;
  
  try {
    await this.newWalletAndKeychain(`${Date.now()}`, {
      currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
    });
  } finally {
    // ALWAYS re-enable automatic backups, even if error occurs
    EngineClass.disableAutomaticVaultBackup = false;
  }
  
  SeedlessOnboardingController.clearState();
  throw error;
}
```

**Import to add at top:**
```typescript
import { clearAllVaultBackups } from '../BackupVault';
```

---

### 4. `app/core/Engine/Engine.ts`
**Purpose:** Add circuit breaker flag to disable vault backups during critical operations

**Key Changes:**
1. Add static property (line 193)
2. Check flag in `handleVaultBackup()` method (line 690-692)

**Code additions:**
```typescript
// Static property (around line 193)
static disableAutomaticVaultBackup = false;

// In handleVaultBackup() method (around line 690-692)
handleVaultBackup() {
  this.controllerMessenger.subscribe(
    AppConstants.KEYRING_STATE_CHANGE_EVENT,
    (state: KeyringControllerState) => {
      // Check if automatic backups are disabled (during wallet reset)
      if (Engine.disableAutomaticVaultBackup) {
        return;
      }
      
      if (!state.vault) {
        return;
      }

      // Back up vault if it exists
      backupVault(state).catch((error) => {
        Logger.error(error, 'Automatic vault backup failed');
      });
    },
  );
}
```

---

### 5. `app/core/BackupVault/backupVault.ts`
**Purpose:** Clean up - no debug logs needed

**Changes:** NONE (already clean)

---

### 6. `app/core/EngineService/EngineService.ts`
**Purpose:** Fix type issue with state variable

**Key Change (line 138):**
```typescript
// Change from:
const state = persistedState?.backgroundState;

// To:
const state = persistedState?.backgroundState ?? {};
```

---

### 7. `app/store/migrations/index.ts`
**Purpose:** Fix critical bug in inflation/deflation logic

**Key Changes:**
1. Update comment (line 244)
2. Fix inflation condition (line 375)
3. Fix deflation condition (line 380)

**Code changes:**
```typescript
// Line 244 - Update comment:
// - Individual controller files are created automatically by EngineService.setupEnginePersistence()

// Line 375 - Inflation condition:
if (!didInflate && Number(migrationNumber) > 104) {
  state = await inflateFromControllers(state);
  didInflate = true;
}

// Line 380 - Deflation condition (CRITICAL FIX):
if (Number(migrationNumber) === lastVersion && lastVersion >= 104) {
  const s2 = migratedState as StateWithEngine;
  const hasControllers = Boolean(
    s2.engine?.backgroundState &&
      Object.keys(s2.engine.backgroundState).length > 0,
  );
  if (hasControllers) {
    return await deflateToControllersAndStrip(migratedState);
  }
}
```

---

### 8. `app/store/migrations/index.test.ts`
**Purpose:** Update test to match fixed logic

**Key Change (line 379):**
```typescript
// Update test name and assertions:
it('should not trigger inflation for migrations <= 104', async () => {
  // ...test code...
  
  // Inflation should NOT happen for migration 104
  expect(
    mockedControllerStorage.getAllPersistedState,
  ).not.toHaveBeenCalled();
  
  // Deflation SHOULD happen for migration 104 (lastVersion >= 104)
  expect(mockedControllerStorage.setItem).toHaveBeenCalled();
});
```

---

## New Files Created (0 files)

**Note:** The documentation files (`OAUTH_VAULT_BACKUP_ISSUE.md`, `VAULT_BACKUP_BUG_SUMMARY.md`) should NOT be included in the PR.

---

## Quick Apply Commands

### Option 1: Cherry-pick your commits
```bash
# From the new clean branch
git cherry-pick 2421a09203  # Vault Recovery Migration Failure Solution
git cherry-pick 17531365ae  # Update migration logic
```

### Option 2: Manual file checkout
```bash
# Create new branch from main
git checkout main
git pull origin main
git checkout -b spike/vault-recovery-clean

# Copy only the modified files
git checkout spike/new-persist-abuse-testing -- \
  app/components/Views/Onboarding/index.js \
  app/components/hooks/DeleteWallet/useDeleteWallet.ts \
  app/core/Authentication/Authentication.ts \
  app/core/Engine/Engine.ts \
  app/core/EngineService/EngineService.ts \
  app/store/migrations/index.ts \
  app/store/migrations/index.test.ts

# Verify changes
git status
git diff --cached
```

### Option 3: Apply from this document
Use the code snippets above to manually apply each change to a clean branch.

---

## Testing Commands

After applying changes:

```bash
# Run migration tests
yarn jest app/store/migrations/index.test.ts

# Run all unit tests (optional)
yarn test:unit

# Check for linter errors
yarn lint
```

---

## Files to Exclude

Do NOT include in the new branch:
- `OAUTH_VAULT_BACKUP_ISSUE.md`
- `VAULT_BACKUP_BUG_SUMMARY.md`
- `CHANGES_TO_REAPPLY.md` (this file)
- Any `.husky/pre-commit` changes
- Any staged new files

---

## Commit Messages

Suggested commit structure for clean branch:

**Commit 1:**
```
feat: Add vault recovery detection on onboarding screen

- Detect migration failure scenario when vault backup exists but Redux state is reset
- Automatically navigate to vault recovery screen
- Skip detection for intentional wallet resets (route.params.delete)
```

**Commit 2:**
```
feat: Prevent temporary vault backups during wallet operations

- Add disableAutomaticVaultBackup flag to Engine
- Apply flag during manual wallet deletion
- Apply flag during OAuth error recovery
- Use finally block to ensure flag is always reset
```

**Commit 3:**
```
fix: Correct migration inflation/deflation conditions

BREAKING: Fix critical bug where deflation wouldn't run for migration 104

- Change deflation condition from `> 104` to `>= 104`
- Ensures first release with file-based persistence creates individual files
- Update test to reflect correct behavior
```

---

## Summary of Changes

**Total files modified:** 8
**Total files created:** 0 (documentation only)
**Lines changed:** ~150 lines across all files

**Core components:**
1. Vault recovery detection (Onboarding)
2. Race condition prevention (useDeleteWallet, Authentication, Engine)
3. Migration logic fix (migrations/index.ts)

All changes are focused, isolated, and well-tested. ✅

