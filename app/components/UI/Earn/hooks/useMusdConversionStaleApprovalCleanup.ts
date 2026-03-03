import { providerErrors } from '@metamask/rpc-errors';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { selectUnapprovedMusdConversions } from '../selectors/musdConversionStatus';

/**
 * Rejects stale mUSD conversion pending approvals on app foreground.
 *
 * If the app backgrounds while a mUSD conversion is pending approval, some
 * flows can stay disabled because the pending approval remains unresolved.
 * This hook rejects those stale unapproved mUSD approvals when the app returns
 * to active state.
 */
export const useMusdConversionStaleApprovalCleanup = () => {
  const pendingUnapprovedMusdConversions = useSelector(
    selectUnapprovedMusdConversions,
  );

  const pendingMusdUnapprovedTransactionIds = useMemo(
    () =>
      pendingUnapprovedMusdConversions.map(
        (transactionMeta) => transactionMeta.id,
      ),
    [pendingUnapprovedMusdConversions],
  );

  const pendingMusdUnapprovedTransactionIdsRef = useRef<string[]>([]);
  pendingMusdUnapprovedTransactionIdsRef.current =
    pendingMusdUnapprovedTransactionIds;

  useEffect(() => {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only treat a true background return as stale approval cleanup signal.
      // iOS transient system overlays (Notification/Control Center) can emit
      // active -> inactive -> active and should not clear pending approvals.
      const shouldRejectStaleApprovals =
        previousAppState === 'background' && nextAppState === 'active';

      if (!shouldRejectStaleApprovals) {
        previousAppState = nextAppState;
        return;
      }

      const staleApprovalTransactionIds =
        pendingMusdUnapprovedTransactionIdsRef.current;

      if (staleApprovalTransactionIds.length === 0) {
        previousAppState = nextAppState;
        return;
      }

      Logger.log(
        '[mUSD Conversion] Rejecting stale pending approvals on foreground',
        {
          count: staleApprovalTransactionIds.length,
          transactionIds: staleApprovalTransactionIds,
        },
      );

      for (const transactionId of staleApprovalTransactionIds) {
        Engine.rejectPendingApproval(
          transactionId,
          providerErrors.userRejectedRequest({
            message:
              'Automatically rejected stale mUSD conversion pending approval on app foreground',
            data: {
              cause: 'useMusdConversionStaleApprovalCleanup',
              transactionId,
            },
          }),
          {
            ignoreMissing: true,
            logErrors: false,
          },
        );
      }

      previousAppState = nextAppState;

      // Pop the orphaned confirmation screen on the next frame so React
      // finishes processing the approval-rejection state updates first.
      requestAnimationFrame(() => {
        const currentRoute = NavigationService.navigation.getCurrentRoute();
        if (
          currentRoute?.name ===
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
        ) {
          NavigationService.navigation.goBack();
        }
      });
    };

    const appStateListener = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      appStateListener.remove();
    };
  }, []);
};
