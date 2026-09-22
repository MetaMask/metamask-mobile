import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';

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
 * On mount, records the session-scoped idOS / SumSub consents and opens the
 * SumSub document-verification journey back-to-back, then advances the funnel
 * with an optimistic pending KYC status (backend applicant status lags).
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
 * - A completed run advances `finalStatus` to `pending` and navigates onward.
 * - An unchanged status means the applicant closed the SDK before submitting.
 * Mobile then shows "More information needed" and offers to continue.
 */
export const useLaunchSumSub = (): UseLaunchSumSubResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const [isLaunching, setIsLaunching] = useState(true);
  const [needsMoreInfo, setNeedsMoreInfo] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Guards against React 18 strict-mode double-invoke and re-renders launching
  // the SDK more than once per attempt.
  const inFlightRef = useRef(false);

  const retry = useCallback(() => {
    setHasError(false);
    setNeedsMoreInfo(false);
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
        const catalog = await KycController.fetchSessionDisclaimers({
          country,
        });
        await KycController.recordSessionDisclaimers({
          providerDisclaimersAccepted: toAcceptedDisclaimerKeys(
            catalog.kycProvider,
          ),
          idosDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.idOS),
          credentialReusabilityConsentGiven: false,
        });

        await KycController.launchProviderFlow({});
        if (KycController.state.sessionStatus?.finalStatus === 'pending') {
          // The applicant submitted the SDK flow. The authoritative vendor
          // decision still lags, so advance with an optimistic pending status.
          navigation.navigate(Routes.RAMP.VBA_KYC_PENDING);
        } else {
          // SumSub resolves when its close button is pressed. The controller
          // deliberately leaves finalStatus unchanged unless the applicant
          // submitted, so keep verification retryable instead of showing the
          // pending-review screen.
          setNeedsMoreInfo(true);
          setIsLaunching(false);
        }
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
  }, [attempt, navigation]);

  return { isLaunching, needsMoreInfo, hasError, retry };
};
