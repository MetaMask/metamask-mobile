import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  selectKycSessionFinalStatus,
  selectKycSessionKycStatus,
} from '../../../../../../selectors/kycController';
import type { VbaOnboardingDestinationId } from '../vbaOnboardingFunnel';
import { useOpenVbaOnboarding } from './useVbaOnboardingRouting';

export const VBA_KYC_STATUS_REDIRECT_SOURCE = 'kyc_pending-status-change';

/** `finalStatus` values that end KycController session polling. */
const TERMINAL_FINAL_STATUSES = new Set(['approved', 'rejected', 'retry']);

interface KycStatusPair {
  finalStatus: string | null;
  kycStatus: string | null;
}

/**
 * Whether the KYC session has a decision the onboarding funnel can act on.
 * Hydrate already treats `kycStatus: approved` as approved while the vendor
 * `finalStatus` is still pending.
 *
 * @param status - The session's `finalStatus` and `kycStatus`.
 * @returns True when the coordinator should route away from the pending screen.
 */
export const isTerminalVbaKycStatus = ({
  finalStatus,
  kycStatus,
}: KycStatusPair): boolean =>
  kycStatus === 'approved' ||
  (finalStatus !== null && TERMINAL_FINAL_STATUSES.has(finalStatus));

/**
 * Watches the KycController session status while the KYC pending screen is
 * mounted and re-runs the onboarding coordinator once the decision is terminal.
 * Returning to the foreground with a non-terminal status calls
 * `refreshSessionStatus`, which restarts the controller poll with an immediate
 * fetch. Any resulting update flows through the same watcher.
 */
export const useVbaKycStatusRedirect = (): void => {
  const finalStatus = useSelector(selectKycSessionFinalStatus);
  const kycStatus = useSelector(selectKycSessionKycStatus);
  const openOnboarding = useOpenVbaOnboarding(VBA_KYC_STATUS_REDIRECT_SOURCE);

  const isMountedRef = useRef(false);
  const isRunningRef = useRef(false);
  const handledStatusKeyRef = useRef<string | null>(null);
  const latestStatusRef = useRef<KycStatusPair>({ finalStatus, kycStatus });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const redirectIfTerminal = useCallback(
    function runRedirect(): void {
      const status = latestStatusRef.current;
      if (
        !isMountedRef.current ||
        isRunningRef.current ||
        !isTerminalVbaKycStatus(status)
      ) {
        return;
      }
      const statusKey = `${status.finalStatus}:${status.kycStatus}`;
      if (handledStatusKeyRef.current === statusKey) {
        return;
      }

      handledStatusKeyRef.current = statusKey;
      isRunningRef.current = true;
      let didNavigate = false;
      // Re-navigating to kycPending would mount a fresh copy of this screen
      // that sees the same terminal status and runs again.
      const shouldNavigate = (
        destinationId: VbaOnboardingDestinationId,
      ): boolean => {
        if (!isMountedRef.current || destinationId === 'kycPending') {
          return false;
        }
        didNavigate = true;
        return true;
      };

      openOnboarding({ shouldNavigate }).finally(() => {
        isRunningRef.current = false;
        // Pick up a different terminal status that arrived while in flight.
        if (!didNavigate) {
          runRedirect();
        }
      });
    },
    [openOnboarding],
  );

  // Runs on mount too: hydrate's immediate poll can land a terminal status
  // before this screen mounts, and the poll stops after a terminal status.
  useEffect(() => {
    latestStatusRef.current = { finalStatus, kycStatus };
    redirectIfTerminal();
  }, [finalStatus, kycStatus, redirectIfTerminal]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState !== 'active') {
          return;
        }
        const hasSession = finalStatus !== null || kycStatus !== null;
        if (!hasSession || isTerminalVbaKycStatus({ finalStatus, kycStatus })) {
          return;
        }
        try {
          Engine.context.KycController.refreshSessionStatus();
        } catch (error) {
          Logger.error(error as Error, {
            tags: { feature: 'vba-onboarding' },
            context: {
              name: 'useVbaKycStatusRedirect',
              data: { step: 'refreshSessionStatus' },
            },
          });
        }
      },
    );
    return () => subscription.remove();
  }, [finalStatus, kycStatus]);
};
