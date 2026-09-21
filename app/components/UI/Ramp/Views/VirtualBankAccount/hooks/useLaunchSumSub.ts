import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';

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
 * On mount, records the session-scoped idOS / SumSub consents and opens the
 * SumSub document-verification journey back-to-back, then re-hydrates VBA
 * onboarding and routes to whatever stage the outcome resolves to.
 *
 * The UKYC session was created at the email step (`startSession`) and its
 * consents were already accepted on Verify Identity, but they are re-recorded
 * here so the idOS applicant is created immediately before the journey — the
 * relay only keeps the applicant valid when the session consents and the
 * journey happen back-to-back, so splitting them across screens yields a
 * "Failed to get applicant" error. `recordSessionDisclaimers` is idempotent
 * (a 409 for already-accepted consents is swallowed).
 *
 * `launchProviderFlow` fails closed (it never throws) and records the outcome
 * on `sessionStatus.finalStatus`:
 * - a completed run advances `finalStatus` off `new` (e.g. to `pending`) →
 *   hydrate and navigate onward;
 * - an unchanged status means the applicant abandoned the SDK or the journey
 *   failed. The controller doesn't distinguish the two, so we surface a
 *   retryable error and keep the user here rather than silently bouncing back.
 */
export const useLaunchSumSub = (): UseLaunchSumSubResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const [isLaunching, setIsLaunching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Guards against React 18 strict-mode double-invoke and re-renders launching
  // the SDK more than once per attempt.
  const inFlightRef = useRef(false);

  const retry = useCallback(() => {
    setHasError(false);
    setIsLaunching(true);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;

    const launch = async () => {
      try {
        const { KycController, KycService } = Engine.context;
        if (!KycService) {
          throw new Error('KYC service is unavailable');
        }

        const country = await KycService.getGeoCountry();
        const catalog = await KycController.fetchSessionDisclaimers({ country });
        await KycController.recordSessionDisclaimers({
          providerDisclaimersAccepted: toAcceptedDisclaimerKeys(
            catalog.kycProvider,
          ),
          idosDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.idOS),
          credentialReusabilityConsentGiven: false,
        });

        await KycController.launchProviderFlow({});
        // The applicant has finished the SumSub SDK. `launchProviderFlow` only
        // marks the session finalStatus 'pending' and starts polling — the
        // applicant lifecycle (kycStatus) still reads 'new' for a moment while
        // the backend processes the submission. So route straight to the
        // pending screen (which polls for the final decision) rather than
        // re-hydrating on a not-yet-updated status, which would resolve back to
        // this launch screen and leave the user on an endless spinner.
        navigation.navigate(Routes.RAMP.VBA_KYC_PENDING);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-kyc', provider: 'sumsub' },
        });
        setHasError(true);
        setIsLaunching(false);
      } finally {
        inFlightRef.current = false;
      }
    };

    launch();
  }, [navigation, attempt]);

  return { isLaunching, hasError, retry };
};
