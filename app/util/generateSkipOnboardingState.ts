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
import { getCommandQueueServerPortInApp } from './test/utils';
import { Platform } from 'react-native';
import { SrpProfile } from '../../tests/framework/types';

const FETCH_TIMEOUT = 40000; // Timeout in milliseconds

const fetchWithTimeout = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });

export const VAULT_INITIALIZED_KEY = '@MetaMask:vaultInitialized';

export const predefinedPassword = process.env.PREDEFINED_PASSWORD;

const isBrowserStackLocalAndIOS =
  process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true' &&
  Platform.OS === 'ios';

export const performanceSrps = [
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

export const mmConnectSrps = [process.env.MM_CONNECT_SRP_1];

/**
 * Apply the vault initialization to Redux store and return vault data if needed
 * This should be called during EngineService startup
 */
async function applyVaultInitialization() {
  if (process.env.IS_TEST_BUILD !== 'true') {
    return null;
  }

  // eslint-disable-next-line no-console
  console.log(
    '[E2E - generateSkipOnboardingState] Performance E2E Context detected',
  );
  let srpProfile: SrpProfile | undefined;

  /**
   * When running tests on BrowserStack, local services need to be accessed through
   * BrowserStack's local tunnel hostname. For local development,
   * standard localhost is used.
   */
  const hosts = ['localhost', 'bs-local.com'];
  if (Platform.OS === 'android') {
    hosts.push('10.0.2.2');
  }

  const port = getCommandQueueServerPortInApp();
  // eslint-disable-next-line no-console
  console.log(
    `[E2E - generateSkipOnboardingState] Command queue server port: ${port}`,
  );
  const protocol = isBrowserStackLocalAndIOS ? 'https' : 'http';

  for (const host of hosts) {
    const testUrl = `${protocol}://${host}:${port}/srp-profile-type.json`;
    // eslint-disable-next-line no-console
    console.log(
      `[E2E - generateSkipOnboardingState] Trying command queue server at: ${testUrl}`,
    );

    try {
      const response = await fetchWithTimeout(testUrl);
      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log(
          `[E2E - generateSkipOnboardingState] Command queue server at ${testUrl} is available`,
        );

        // The amount of SRPs is provided by the Command Queue Server
        const data = await response.json();

        // Return if the SRP profile is set to ONBOARDING
        if (data.srpProfile === SrpProfile.ONBOARDING) {
          return null;
        }

        // Set the SRP profile to the one provided by the Command Queue Server
        srpProfile = data.srpProfile;
        if (!srpProfile) {
          console.warn(
            `[E2E - generateSkipOnboardingState] SRP profile type is not provided by the Command Queue Server`,
          );
          srpProfile = SrpProfile.PERFORMANCE;
        }
        break;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(
        `[E2E - generateSkipOnboardingState] Failed to reach command queue server at ${testUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue to next host
    }
  }

  const srpsToImport =
    srpProfile === SrpProfile.PERFORMANCE ? performanceSrps : mmConnectSrps;

  const password = process.env.PREDEFINED_PASSWORD;
  if (password && !(await StorageWrapper.getItem(VAULT_INITIALIZED_KEY))) {
    await Authentication.newWalletAndKeychain(password, {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });

    for (const srp of srpsToImport) {
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
  }

  return null;
}

export { applyVaultInitialization };
