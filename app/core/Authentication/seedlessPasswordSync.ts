import { IconName } from '@metamask/design-system-react-native';
import {
  PasswordSyncInstruction,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';
import { strings } from '../../../locales/i18n';
import { setIsConnectionRemoved } from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import Logger from '../../util/Logger';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { containsErrorMessage } from '../../util/errorHandling';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import Engine from '../Engine';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import NavigationService from '../NavigationService';
import ReduxService from '../redux';
import { signOutCardAfterPasswordChange } from '../signOutCardAfterPasswordChange';
import { UNLOCK_WALLET_ERROR_MESSAGES } from './constants';

export interface CheckIsSeedlessPasswordOutdatedOptions {
  /** When true, bypasses SeedlessOnboardingController password-outdated cache. Default: true */
  skipCache?: boolean;
  /** When true, failed controller checks are reported to Sentry via {@link Logger.error}. Default: false */
  captureSentryError?: boolean;
}

export interface SyncPasswordAndUnlockWalletDependencies {
  rehydrateSeedPhrase: (password: string) => Promise<void>;
  lockApp: (options: {
    locked: boolean;
    reset: boolean;
    navigateToLogin?: boolean;
  }) => Promise<void>;
  resetPassword: () => Promise<void>;
}

export interface CheckAndShowSeedlessPasswordOutdatedModalDependencies {
  checkIsSeedlessPasswordOutdated?: (
    options?: CheckIsSeedlessPasswordOutdatedOptions,
  ) => Promise<boolean>;
  lockApp: (options: { locked: boolean }) => Promise<void>;
}

/**
 * Stores the current keyring encryption key in the Seedless onboarding
 * controller state.
 *
 * @returns {Promise<void>}
 */
export const syncKeyringEncryptionKey = async (): Promise<void> => {
  const { KeyringController, SeedlessOnboardingController } = Engine.context;
  // Store the keyring encryption key in the seedless onboarding controller.
  const keyringEncryptionKey = await KeyringController.exportEncryptionKey();
  await SeedlessOnboardingController.storeKeyringEncryptionKey(
    keyringEncryptionKey,
  );
};

/**
 * Advances the Seedless password-change lifecycle to `KEY_SYNC_PENDING`,
 * stores and verifies the current Keyring encryption key, and clears the
 * lifecycle once synchronization is verified.
 *
 * @returns {Promise<void>}
 */
export const syncAndCompleteKeyringEncryptionKey = async (): Promise<void> => {
  const { KeyringController, SeedlessOnboardingController } = Engine.context;
  await SeedlessOnboardingController.markPasswordChangeKeySyncPending();
  await syncKeyringEncryptionKey();

  // Verify that the stored key can be decrypted with the current Seedless
  // password before clearing the recovery lifecycle.
  const storedKeyringEncryptionKey =
    await SeedlessOnboardingController.loadKeyringEncryptionKey();
  const currentKeyringEncryptionKey =
    await KeyringController.exportEncryptionKey();
  if (storedKeyringEncryptionKey !== currentKeyringEncryptionKey) {
    throw new Error('Keyring encryption key synchronization failed');
  }

  await SeedlessOnboardingController.completePasswordChange();
};

/**
 * Resolves the current Seedless password synchronization instruction.
 *
 * Non-Seedless wallets are already in sync from the perspective of Seedless
 * password recovery.
 *
 * @param options - Options for resolving the password synchronization state.
 * @param options.skipCache - Whether to bypass the controller's cached remote
 * state (default: false). A pending recovery checkpoint always forces a fresh
 * remote check.
 * @returns The current password synchronization and recovery instruction.
 */
export const resolveSeedlessPasswordSyncInstruction = async ({
  skipCache = false,
}: { skipCache?: boolean } = {}): Promise<PasswordSyncInstruction> => {
  if (!selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    return PasswordSyncInstruction.InSync;
  }
  const { SeedlessOnboardingController } = Engine.context;
  return await SeedlessOnboardingController.resolvePasswordSyncState({
    skipCache,
  });
};

/**
 * Checks if the seedless password is outdated or requires recovery.
 *
 * @param options - Options for checking password sync state.
 * @param options.skipCache - whether to skip the cache (default: true)
 * @param options.captureSentryError - when true, failed checks are reported to Sentry via {@link Logger.error} (default: false)
 * @returns true if password sync or recovery is required, false otherwise (or when not in seedless flow)
 */
export const checkIsSeedlessPasswordOutdated = async (
  options: CheckIsSeedlessPasswordOutdatedOptions = {},
): Promise<boolean> => {
  const skipCache = options.skipCache ?? true;
  const captureSentryError = options.captureSentryError ?? false;
  try {
    const passwordSyncInstruction =
      await resolveSeedlessPasswordSyncInstruction({ skipCache });
    return passwordSyncInstruction !== PasswordSyncInstruction.InSync;
  } catch (error) {
    if (captureSentryError) {
      Logger.error(error as Error, 'Error in checkIsSeedlessPasswordOutdated');
    } else {
      Logger.log('checkIsSeedlessPasswordOutdated', error);
    }
    return false;
  }
};

/**
 * Checks whether an error thrown by `SeedlessOnboardingController.reconcilePassword`
 * represents an incorrect password.
 *
 * Depending on the failure path, a wrong password may surface as
 * `SeedlessOnboardingControllerErrorMessage.IncorrectPassword` (TOPRF sync),
 * plain `'Incorrect password'` (`@metamask/browser-passworder`), or mobile
 * `Encryptor` decryption failures (QuickCrypto OpenSSL `bad decrypt`,
 * `'Decrypt failed'`, or `'error in DoCipher, status: 2'`) when decrypting
 * an already-rewritten local Seedless vault during recovery.
 *
 * @param error - Error thrown by `reconcilePassword`.
 * @returns `true` if the error indicates an incorrect password.
 */
const isReconcileIncorrectPasswordError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.message ===
      SeedlessOnboardingControllerErrorMessage.IncorrectPassword ||
    error.message === 'Incorrect password'
  ) {
    return true;
  }

  // Exclude other controller-level Seedless errors (e.g. VaultDataError:
  // "The decrypted vault has an unexpected shape.") before substring-matching
  // mobile Encryptor decrypt errors.
  if (error.message.startsWith('SeedlessOnboardingController -')) {
    return false;
  }

  return (
    containsErrorMessage(error, UNLOCK_WALLET_ERROR_MESSAGES.WRONG_PASSWORD) ||
    containsErrorMessage(
      error,
      UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_WRONG_PASSWORD,
    ) ||
    containsErrorMessage(
      error,
      UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_WRONG_PASSWORD_2,
    )
  );
};

/**
 * Sync latest global seedless password and reconcile the local Keyring with
 * the remote password state. Unlocks the vault with the latest global
 * password.
 *
 * @param globalPassword - latest global seedless password
 * @param deps - Authentication callbacks needed for rehydration, locking, and biometric reset
 */
export const syncPasswordAndUnlockWallet = async (
  globalPassword: string,
  deps: SyncPasswordAndUnlockWalletDependencies,
): Promise<void> => {
  const { SeedlessOnboardingController, KeyringController } = Engine.context;

  const isKeyringPasswordValid = await KeyringController.verifyPassword(
    globalPassword,
  )
    .then(() => true)
    .catch(() => false);

  // Reconcile the Seedless password state with the submitted global password.
  let recoveryInstruction: PasswordSyncInstruction;
  try {
    recoveryInstruction = await SeedlessOnboardingController.reconcilePassword({
      globalPassword,
      maxKeyChainLength: 20,
    });
  } catch (seedlessSyncError) {
    const errorMessage =
      seedlessSyncError instanceof Error ? seedlessSyncError.message : '';
    Logger.log(
      seedlessSyncError,
      `error while reconciling password: ${errorMessage}`,
    );

    if (
      errorMessage ===
      SeedlessOnboardingControllerErrorMessage.MaxKeyChainLengthExceeded
    ) {
      // Unable to recover the old password encryption key because the device
      // is too far behind; rehydrate from social backup instead.
      try {
        await SeedlessOnboardingController.refreshAuthTokens();
      } catch (refreshError) {
        Logger.error(
          refreshError as Error,
          'Failed to refresh auth tokens during MaxKeyChainLength recovery, attempting rehydration anyway',
        );
      }
      await deps.rehydrateSeedPhrase(globalPassword);
      ReduxService.store.dispatch(setIsConnectionRemoved(true));
      return;
    }

    if (isReconcileIncorrectPasswordError(seedlessSyncError)) {
      if (isKeyringPasswordValid) {
        throw new SeedlessOnboardingControllerError(
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        );
      }
      throw seedlessSyncError;
    }

    Logger.error(
      seedlessSyncError as Error,
      'Error in syncPasswordAndUnlockWallet',
    );
    throw seedlessSyncError;
  }

  try {
    switch (recoveryInstruction) {
      case PasswordSyncInstruction.InSync:
        await KeyringController.submitPassword(globalPassword);
        await SeedlessOnboardingController.submitPassword(globalPassword);
        return;
      case PasswordSyncInstruction.ReconcileKeyring: {
        // `reconcilePassword` has already rewritten the Seedless vault and
        // re-wrapped the stored Keyring encryption key under `globalPassword`.
        const keyringEncryptionKey =
          await SeedlessOnboardingController.loadKeyringEncryptionKey();
        await KeyringController.submitEncryptionKey(keyringEncryptionKey);
        await KeyringController.changePassword(globalPassword);
        await syncAndCompleteKeyringEncryptionKey();
        // Card logout is a remote call with no timeout. It must not delay the
        // unlock or sit between the password change and the key sync.
        signOutCardAfterPasswordChange().catch(() => undefined);
        break;
      }
      case PasswordSyncInstruction.SyncKey:
        // `reconcilePassword` unlocked the Seedless vault, while Keyring
        // remains locked until the submitted password is applied.
        await KeyringController.submitPassword(globalPassword);
        await syncAndCompleteKeyringEncryptionKey();
        signOutCardAfterPasswordChange().catch(() => undefined);
        break;
      default:
        throw new Error(
          SeedlessOnboardingControllerErrorMessage.CouldNotRecoverPassword,
        );
    }

    // `reconcilePassword` updates the Seedless vault but does not invalidate
    // the controller's cached outdated-password result. Refresh it so the
    // post-recovery check on Main sees in-sync state instead of a stale modal.
    await SeedlessOnboardingController.resolvePasswordSyncState({
      skipCache: true,
    });
  } catch (err) {
    // Lock app again on error after partial unlock/reconciliation without
    // resetting navigation so the caller's error handler can route cleanly.
    await deps.lockApp({ locked: true, reset: false, navigateToLogin: false });
    throw err;
  }

  // Reset biometrics since the previously stored password is no longer valid.
  await deps.resetPassword();
};

/**
 * Checks if the seedless password is outdated and shows a modal if it is.
 * This method verifies the outdated state and navigates to show the password outdated modal.
 *
 * @param isSeedlessPasswordOutdated - whether the seedless password is marked as outdated in state
 * @param deps - Callbacks to check outdated status and lock the app
 * @returns {Promise<void>}
 */
export const checkAndShowSeedlessPasswordOutdatedModal = async (
  isSeedlessPasswordOutdated: boolean,
  deps: CheckAndShowSeedlessPasswordOutdatedModalDependencies,
): Promise<void> => {
  if (!isSeedlessPasswordOutdated) {
    return;
  }

  const checkOutdated =
    deps.checkIsSeedlessPasswordOutdated ?? checkIsSeedlessPasswordOutdated;

  // Check for latest seedless password outdated state.
  // isSeedlessPasswordOutdated is true when navigating to wallet main screen after login with password sync.
  const isOutdated = await checkOutdated({
    skipCache: false,
    captureSentryError: true,
  });
  if (!isOutdated) {
    return;
  }

  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.PASSWORD_OUTDATED_MODAL_VIEWED,
    )
      .addProperties({ category: 'App' })
      .build(),
  );

  // Show seedless password outdated modal and force user to lock app.
  NavigationService.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
    params: {
      title: strings('login.seedless_password_outdated_modal_title'),
      description: strings('login.seedless_password_outdated_modal_content'),
      primaryButtonLabel: strings(
        'login.seedless_password_outdated_modal_confirm',
      ),
      type: 'error',
      icon: IconName.Danger,
      isInteractable: false,
      onPrimaryButtonPress: async () => {
        await deps.lockApp({ locked: true });
      },
      closeOnPrimaryButtonPress: true,
    },
  });
};
