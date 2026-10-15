import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  KYC_STATUSES,
  TERMINAL_SESSION_STATUSES,
} from '@metamask/kyc-controller';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { selectKycSessionStatus } from '../../../../../../selectors/kycController';
import {
  navigateToVbaOnboardingDestination,
  resolveVbaOnboarding,
} from './useVbaOnboardingRouting';

const VBA_KYC_STATUS_REDIRECT_SOURCE = 'kyc_pending-status-change';

interface KycStatusPair {
  finalStatus: string | null;
  kycStatus: string | null;
}

const getStatusKey = ({ finalStatus, kycStatus }: KycStatusPair): string =>
  `${finalStatus}:${kycStatus}`;

export const isTerminalVbaKycStatus = ({
  finalStatus,
  kycStatus,
}: KycStatusPair): boolean =>
  kycStatus === KYC_STATUSES.approved ||
  (finalStatus !== null && TERMINAL_SESSION_STATUSES.has(finalStatus));

export const useVbaKycStatusRedirect = (): (() => void) => {
  const navigation = useNavigation<AppNavigationProp>();
  const sessionStatus = useSelector(selectKycSessionStatus);
  const finalStatus = sessionStatus?.finalStatus ?? null;
  const kycStatus = sessionStatus?.kycStatus ?? null;

  const isMountedRef = useRef(false);
  const hasLeftRef = useRef(false);
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
        hasLeftRef.current ||
        isRunningRef.current ||
        !isTerminalVbaKycStatus(status)
      ) {
        return;
      }
      const statusKey = getStatusKey(status);
      if (handledStatusKeyRef.current === statusKey) {
        return;
      }

      handledStatusKeyRef.current = statusKey;
      isRunningRef.current = true;

      resolveVbaOnboarding(VBA_KYC_STATUS_REDIRECT_SOURCE)
        .then((resolved) => {
          isRunningRef.current = false;
          if (!isMountedRef.current || hasLeftRef.current) {
            if (hasLeftRef.current) {
              handledStatusKeyRef.current = null;
            }
            return;
          }
          if (resolved.status === 'error') {
            navigateToVbaOnboardingDestination(navigation, 'error');
            return;
          }
          // Re-navigating to kycPending would mount a fresh copy of this screen
          // that sees the same terminal status and runs again, so stay here.
          if (resolved.destinationId !== 'kycPending') {
            Logger.log('[vba-onboarding] resume', {
              source: VBA_KYC_STATUS_REDIRECT_SOURCE,
              snapshot: resolved.snapshot,
              destinationId: resolved.destinationId,
            });
            navigateToVbaOnboardingDestination(
              navigation,
              resolved.destinationId,
              resolved.snapshot,
            );
            return;
          }
          // Pick up a different terminal status that arrived while in flight.
          if (getStatusKey(latestStatusRef.current) !== statusKey) {
            runRedirect();
          }
        })
        .catch((error: unknown) => {
          isRunningRef.current = false;
          Logger.error(error as Error, {
            tags: { feature: 'vba-onboarding' },
            context: {
              name: 'useVbaKycStatusRedirect',
              data: { step: 'redirect' },
            },
          });
        });
    },
    [navigation],
  );

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

  const leave = useCallback(() => {
    hasLeftRef.current = true;
    handledStatusKeyRef.current = null;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          refreshSessionStatusIfPending();
        }
      },
    );
    return () => subscription.remove();
  }, [refreshSessionStatusIfPending]);

  return leave;
};
