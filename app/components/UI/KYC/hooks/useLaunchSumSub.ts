import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import {
  clearPostUnlockResume,
  setPostUnlockResume,
} from '../../../../core/PostUnlockResume';
import Logger from '../../../../util/Logger';
import { getVbaOnboardingResumeState } from '../../Ramp/Views/VirtualBankAccount/routes';
import type { VbaIdentityVerificationCompletion } from '../Views/SumSub/types';

export const VBA_KYC_RESUME_OWNER = 'vba-kyc';
const VBA_KYC_RESUME_SOURCE = 'vba-kyc-relaunch';
/** How long after the user leaves the app a relaunch still reopens KYC. */
export const VBA_KYC_RESUME_MAX_AGE_MS = 2 * 60 * 1000;

const markKycResume = () =>
  setPostUnlockResume({
    owner: VBA_KYC_RESUME_OWNER,
    state: getVbaOnboardingResumeState(VBA_KYC_RESUME_SOURCE),
    maxAgeMs: VBA_KYC_RESUME_MAX_AGE_MS,
  });

export interface UseLaunchSumSubResult {
  /** Whether the SDK launch is in flight (show a spinner). */
  isLaunching: boolean;
  /** True when the launch failed and the user can retry. */
  hasError: boolean;
  /** Re-attempts the launch. */
  retry: () => void;
}

const toAcceptedDisclaimerKeys = (
  documents: (KycCatalogDocument | KycConsentDocument)[] | undefined,
): KycConsentRecord[] =>
  (documents ?? []).map(({ key, version }) => ({ key, version }));

/**
 * Records session-scoped idOS and SumSub provider consents.
 *
 * This operation must run immediately before `launchProviderFlow` to ensure
 * idOS applicant creation and provider launch remain back-to-back. Splitting
 * these operations across screens or with navigation in between yields a
 * "Failed to get applicant" error from the provider.
 *
 * `recordSessionDisclaimers` is idempotent; a 409 for already-accepted
 * consents is swallowed by the controller.
 */
async function recordSessionConsents(): Promise<void> {
  const { KycController, KycService } = Engine.context;
  if (!KycService) {
    throw new Error('KYC service is unavailable');
  }

  const country = await KycService.getGeoCountry();
  const catalog = await KycController.fetchSessionDisclaimers({
    country,
  });
  await KycController.recordSessionDisclaimers({
    providerDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.kycProvider),
    idosDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.idOS),
    credentialReusabilityConsentGiven: false,
  });
}

/**
 * On mount, records session-scoped idOS / SumSub consents and launches the
 * SumSub document-verification journey back-to-back, then reports the outcome
 * to the VBA coordinator.
 *
 * The UKYC session was created at the email step. The identity module displays
 * the session terms first, but records consent immediately before launch to
 * keep consent recording and provider launch atomic. Splitting those operations
 * across screens yields a "Failed to get applicant" error.
 *
 * A half-completed (abandoned) KYC session re-enters here too and relaunches
 * the provider directly instead of stopping at an interstitial. Closing the
 * provider before submitting reports the caller (money home), whose card is
 * the resume point; re-entry from it relaunches the provider directly.
 *
 * `launchProviderFlow` returns a durable provider-flow outcome. A submitted
 * run advances onboarding, an abandoned run returns to the caller, and a
 * failed run surfaces an error.
 *
 * While the provider is open, a post-unlock resume request lets the next cold
 * start reopen onboarding. iOS kills the app when camera access changes in
 * Settings.
 */
export const useLaunchSumSub = (
  onSubmitted: (
    result: VbaIdentityVerificationCompletion,
  ) => void | Promise<void>,
  onAbandoned: () => void | Promise<void>,
): UseLaunchSumSubResult => {
  const [isLaunching, setIsLaunching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Guards against React 18 strict-mode double-invoke and re-renders launching
  // the SDK more than once per attempt.
  const inFlightRef = useRef(false);
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const retry = useCallback(() => {
    setHasError(false);
    setIsLaunching(true);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    if (inFlightRef.current) {
      return undefined;
    }
    inFlightRef.current = true;
    let cancelled = false;
    let appStateSubscription: NativeEventSubscription | undefined;
    let marked = false;

    const stopKycResume = async () => {
      appStateSubscription?.remove();
      appStateSubscription = undefined;
      if (marked) {
        marked = false;
        await clearPostUnlockResume(VBA_KYC_RESUME_OWNER);
      }
    };

    const launch = async () => {
      try {
        const { KycController } = Engine.context;
        if (!KycController) {
          throw new Error('KYC controller is unavailable');
        }

        await recordSessionConsents();
        if (cancelled) {
          return;
        }

        await markKycResume();
        marked = true;
        appStateSubscription = AppState.addEventListener('change', (state) => {
          if (state === 'background') {
            markKycResume();
          }
        });

        const outcome = await KycController.launchProviderFlow({});
        await stopKycResume();
        if (cancelled) {
          return;
        }
        if (outcome === 'submitted') {
          await onSubmitted({ status: 'submitted' });
        } else if (outcome === 'abandoned') {
          await onAbandoned();
        } else {
          throw new Error('KYC provider flow failed');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        Logger.error(error as Error, {
          tags: { feature: 'vba-kyc', provider: 'sumsub' },
        });
        setHasError(true);
        setIsLaunching(false);
      } finally {
        await stopKycResume();
        if (attemptRef.current === attempt) {
          inFlightRef.current = false;
        }
      }
    };

    launch();

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
  }, [attempt, onSubmitted, onAbandoned]);

  return { isLaunching, hasError, retry };
};
