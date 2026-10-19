import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  KycControllerState,
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { takePrefetchedSumsubToken } from './sumsubTokenPrefetch';
import type { VbaIdentityVerificationCompletion } from '../Views/SumSub/types';

export interface UseLaunchSumSubResult {
  /** Whether the SDK launch is in flight (show a spinner). */
  isLaunching: boolean;
  /** True when the applicant closed SumSub before submitting. */
  needsMoreInfo: boolean;
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
 * True when the current KYC session already has server-recorded session
 * consents (`consentStatus === 'given'`), so the record chain can be skipped
 * and the launch can go straight to the provider.
 *
 * The check is gated on persisted accepted records in controller state: on a
 * first launch there are none, and the verification GET would only add
 * latency in front of the mandatory record call. A rejected or falsy check
 * falls back to recording, which stays correct in every case.
 */
async function hasServerRecordedConsents(kycController: {
  state?: KycControllerState;
  hasCompletedSessionDisclaimers: () => Promise<boolean>;
}): Promise<boolean> {
  const state = kycController.state;
  const hasPersistedRecords = Boolean(
    state?.providerDisclaimersAccepted?.sumsub?.length ||
      state?.idosDisclaimersAccepted?.length,
  );
  if (!hasPersistedRecords) {
    return false;
  }
  try {
    return await kycController.hasCompletedSessionDisclaimers();
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'vba-kyc', provider: 'sumsub' },
      context: { name: 'hasServerRecordedConsents' },
    });
    return false;
  }
}

/**
 * On mount, records session-scoped idOS / SumSub consents and launches the
 * SumSub document-verification journey back-to-back, then reports the outcome
 * to the VBA coordinator.
 *
 * The UKYC session was created at the email step. The identity module displays
 * the session terms first, but records consent immediately before launch to
 * keep consent recording and provider launch atomic. Splitting those
 * operations across screens yields a "Failed to get applicant" error. A
 * re-entry with consents already on the server verifies that with one GET and
 * skips the record chain.
 *
 * A half-completed (abandoned) KYC session re-enters here too and relaunches
 * the provider directly instead of stopping at an interstitial.
 *
 * `launchProviderFlow` returns a durable provider-flow outcome. A submitted
 * run advances onboarding, an abandoned run remains retryable, and a failed
 * run surfaces an error.
 */
export const useLaunchSumSub = (
  onSubmitted: (
    result: VbaIdentityVerificationCompletion,
  ) => void | Promise<void>,
): UseLaunchSumSubResult => {
  const [isLaunching, setIsLaunching] = useState(true);
  const [needsMoreInfo, setNeedsMoreInfo] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Guards against React 18 strict-mode double-invoke and re-renders launching
  // the SDK more than once per attempt.
  const inFlightRef = useRef(false);
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const retry = useCallback(() => {
    setHasError(false);
    setNeedsMoreInfo(false);
    setIsLaunching(true);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    if (inFlightRef.current) {
      return undefined;
    }
    inFlightRef.current = true;
    let cancelled = false;

    const launch = async () => {
      try {
        const { KycController } = Engine.context;
        if (!KycController) {
          throw new Error('KYC controller is unavailable');
        }

        if (await hasServerRecordedConsents(KycController)) {
          // Re-entry: consents are already on the server for this session.
        } else {
          await recordSessionConsents();
        }
        if (cancelled) {
          return;
        }

        const applicantAccessToken = await takePrefetchedSumsubToken();
        if (cancelled) {
          return;
        }

        const outcome = await KycController.launchProviderFlow({
          applicantAccessToken,
        });
        if (cancelled) {
          return;
        }
        if (outcome === 'submitted') {
          await onSubmitted({ status: 'submitted' });
        } else if (outcome === 'abandoned') {
          setNeedsMoreInfo(true);
          setIsLaunching(false);
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
  }, [attempt, onSubmitted]);

  return { isLaunching, needsMoreInfo, hasError, retry };
};
