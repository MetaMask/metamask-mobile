import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import {
  KYC_STATUSES,
  TERMINAL_SESSION_STATUSES,
} from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  selectKycSessionFinalStatus,
  selectKycSessionKycStatus,
} from '../../../../../../selectors/kycController';
import type { VbaOnboardingDestinationId } from '../vbaOnboardingFunnel';
import { useOpenVbaOnboarding } from './useVbaOnboardingRouting';

export const VBA_KYC_STATUS_REDIRECT_SOURCE = 'kyc_pending-status-change';

/**
 * Delays between re-checks after a decided KYC status still resolves to this
 * screen, for example an approved session whose MoonPay customer is not Active
 * yet. The KYC poll has stopped by then, so nothing else updates the screen.
 * The last delay repeats.
 */
export const VBA_ACCOUNT_SETUP_RECHECK_DELAYS_MS = [15_000, 30_000, 60_000];

interface KycStatusPair {
  finalStatus: string | null;
  kycStatus: string | null;
}

const getStatusKey = ({ finalStatus, kycStatus }: KycStatusPair): string =>
  `${finalStatus}:${kycStatus}`;

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
  kycStatus === KYC_STATUSES.approved ||
  (finalStatus !== null && TERMINAL_SESSION_STATUSES.has(finalStatus));

/**
 * Watches the KycController session status while the KYC pending screen is
 * mounted and re-runs the onboarding coordinator once the decision is terminal.
 * Hydrate only reads the session status, so mounting with a non-terminal
 * status calls `refreshSessionStatus` to start the controller poll. Returning
 * to the foreground does the same to get an immediate fetch. Any resulting
 * update flows through the same watcher.
 *
 * A terminal status can still resolve to this screen while the account is
 * being set up. The watcher then re-checks on
 * {@link VBA_ACCOUNT_SETUP_RECHECK_DELAYS_MS}, and right away on foreground.
 */
export const useVbaKycStatusRedirect = (): void => {
  const finalStatus = useSelector(selectKycSessionFinalStatus);
  const kycStatus = useSelector(selectKycSessionKycStatus);
  const openOnboarding = useOpenVbaOnboarding(VBA_KYC_STATUS_REDIRECT_SOURCE);

  const isMountedRef = useRef(false);
  const isRunningRef = useRef(false);
  const handledStatusKeyRef = useRef<string | null>(null);
  const latestStatusRef = useRef<KycStatusPair>({ finalStatus, kycStatus });
  const recheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recheckCountRef = useRef(0);

  const clearRecheckTimer = useCallback((): void => {
    if (recheckTimerRef.current !== null) {
      clearTimeout(recheckTimerRef.current);
      recheckTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearRecheckTimer();
    };
  }, [clearRecheckTimer]);

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
      const statusKey = getStatusKey(status);
      if (handledStatusKeyRef.current === statusKey) {
        return;
      }

      clearRecheckTimer();
      handledStatusKeyRef.current = statusKey;
      isRunningRef.current = true;
      let didNavigate = false;
      let resolvedToThisScreen = false;
      const shouldNavigate = (
        destinationId: VbaOnboardingDestinationId,
      ): boolean => {
        if (!isMountedRef.current) {
          return false;
        }
        // Re-navigating to kycPending would mount a fresh copy of this screen
        // that sees the same terminal status and runs again.
        if (destinationId === 'kycPending') {
          resolvedToThisScreen = true;
          return false;
        }
        didNavigate = true;
        return true;
      };

      openOnboarding({ shouldNavigate }).finally(() => {
        isRunningRef.current = false;
        if (didNavigate || !isMountedRef.current) {
          return;
        }
        // Pick up a different terminal status that arrived while in flight.
        if (getStatusKey(latestStatusRef.current) !== statusKey) {
          runRedirect();
          return;
        }
        if (!resolvedToThisScreen) {
          return;
        }
        const delays = VBA_ACCOUNT_SETUP_RECHECK_DELAYS_MS;
        const delay =
          delays[Math.min(recheckCountRef.current, delays.length - 1)];
        recheckCountRef.current += 1;
        recheckTimerRef.current = setTimeout(() => {
          recheckTimerRef.current = null;
          handledStatusKeyRef.current = null;
          runRedirect();
        }, delay);
      });
    },
    [clearRecheckTimer, openOnboarding],
  );

  // Runs on mount too: the status can already be terminal when this screen
  // mounts (SumSub's poll or hydrate's single fetch can land first), and the
  // poll stops after a terminal status.
  useEffect(() => {
    latestStatusRef.current = { finalStatus, kycStatus };
    redirectIfTerminal();
  }, [finalStatus, kycStatus, redirectIfTerminal]);

  const refreshSessionStatusIfPending = useCallback((): void => {
    const status = latestStatusRef.current;
    const hasSession = status.finalStatus !== null || status.kycStatus !== null;
    if (!hasSession || isTerminalVbaKycStatus(status)) {
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
  }, []);

  useEffect(() => {
    refreshSessionStatusIfPending();
  }, [refreshSessionStatusIfPending]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState !== 'active') {
          return;
        }
        // Waiting on account setup: re-check now instead of at the next delay.
        if (recheckTimerRef.current !== null) {
          clearRecheckTimer();
          handledStatusKeyRef.current = null;
          redirectIfTerminal();
          return;
        }
        refreshSessionStatusIfPending();
      },
    );
    return () => subscription.remove();
  }, [clearRecheckTimer, redirectIfTerminal, refreshSessionStatusIfPending]);
};
