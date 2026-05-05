import StorageWrapper from '../store/storage-wrapper';
import {
  seedphraseBackedUp,
  setMultichainAccountsIntroModalSeen,
} from '../actions/user';
import {
  HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS,
  OPTIN_META_METRICS_UI_SEEN,
  PREDICT_GTM_MODAL_SHOWN,
  TRUE,
  USE_TERMS,
} from '../constants/storage';
import { storePrivacyPolicyClickedOrClosed } from '../actions/legalNotices';
import { Authentication } from '../core';
import AUTHENTICATION_TYPE from '../constants/userProperties';
import { importNewSecretRecoveryPhrase } from '../actions/multiSrp';
import { store } from '../store';
import { setLockTime } from '../actions/settings';
import AppConstants from '../core/AppConstants';
import Engine from '../core/Engine';

export const VAULT_INITIALIZED_KEY = '@MetaMask:vaultInitialized';

export const predefinedPassword = process.env.PREDEFINED_PASSWORD;

export const additionalSrps = [
  process.env.ADDITIONAL_SRP_1,
  process.env.ADDITIONAL_SRP_2,
  process.env.ADDITIONAL_SRP_3,
  process.env.ADDITIONAL_SRP_4,
  process.env.ADDITIONAL_SRP_5,
  process.env.ADDITIONAL_SRP_6,
  process.env.ADDITIONAL_SRP_7,
  process.env.ADDITIONAL_SRP_8,
  process.env.ADDITIONAL_SRP_9,
  process.env.ADDITIONAL_SRP_10,
  process.env.ADDITIONAL_SRP_11,
  process.env.ADDITIONAL_SRP_12,
  process.env.ADDITIONAL_SRP_13,
  process.env.ADDITIONAL_SRP_14,
  process.env.ADDITIONAL_SRP_15,
  process.env.ADDITIONAL_SRP_16,
  process.env.ADDITIONAL_SRP_17,
  process.env.ADDITIONAL_SRP_18,
  process.env.ADDITIONAL_SRP_19,
  process.env.ADDITIONAL_SRP_20,
];

/**
 * Apply the vault initialization to Redux store and return vault data if needed
 * This should be called during EngineService startup
 */
async function applyVaultInitialization() {
  if (!predefinedPassword) {
    return null;
  }

  const flagSet = !!(await StorageWrapper.getItem(VAULT_INITIALIZED_KEY));

  // Verify that the Engine actually loaded accounts, not just that the flag exists.
  //
  // The flag is written immediately after wallet creation, but the KeyringController
  // state is flushed to disk with a 200 ms debounce (createPersistController).
  // If the app is restarted within that debounce window the flag is already set but
  // the vault was never written to ControllerStorage, so the Engine starts empty.
  // Checking the live Engine state catches that scenario and allows re-initialization.
  const hasAccounts = Engine.context?.KeyringController?.state?.keyrings?.some(
    (keyring: { accounts: string[] }) => keyring.accounts.length > 0,
  );

  if (flagSet && hasAccounts) {
    return null;
  }

  if (!hasAccounts) {
    await Authentication.newWalletAndKeychain(predefinedPassword, {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });

    for (const srp of additionalSrps) {
      if (!srp) {
        break;
      }

      try {
        await importNewSecretRecoveryPhrase(srp);
      } catch (error) {
        // Skip already imported SRPs or invalid ones, but continue with the rest
        console.warn(
          'Failed to import SRP, skipping:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  await StorageWrapper.setItem(VAULT_INITIALIZED_KEY, 'true');

  // removes the necessity of the user to see the protect your wallet modal
  store.dispatch(seedphraseBackedUp());
  // removes the necessity of the user to see the privacy policy modal
  store.dispatch(storePrivacyPolicyClickedOrClosed());
  // removes the necessity of the user to see the multichain accounts intro modal
  store.dispatch(setMultichainAccountsIntroModalSeen(true));
  // Set auto-lock time for the default
  // Note: This line is tested via component tests (setLockTime action creator + store.dispatch)
  // Full integration testing requires PREDEFINED_PASSWORD env var set before module load
  store.dispatch(setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT));

  // removes the necessity of the user to see the terms of use modal
  await StorageWrapper.setItem(USE_TERMS, TRUE);

  // removes the necessity of the user to see the opt-in metrics modal
  await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, TRUE);

  // removes the necessity of the user to see the predictions GTM modal
  await StorageWrapper.setItem(PREDICT_GTM_MODAL_SHOWN, TRUE);

  // prevents the enable notifications modal from showing
  await StorageWrapper.setItem(HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS, TRUE);

  return null;
}

export { applyVaultInitialization };
