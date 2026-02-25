import { providerErrors } from '@metamask/rpc-errors';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectPendingUnapprovedMusdConversions } from '../selectors/musdConversionStatus';

/**
 * Rejects stale mUSD conversion pending approvals on app foreground.
 *
 * If the app backgrounds while a mUSD conversion is pending approval, some
 * flows can stay disabled because the pending approval remains unresolved.
 * This hook rejects those stale unapproved mUSD approvals when the app returns
 * to active state.
 */
export const useMusdConversionForegroundApprovalCleanup = () => {
  const pendingUnapprovedMusdConversions = useSelector(
    selectPendingUnapprovedMusdConversions,
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
      const shouldRecoverApprovals =
        Boolean(previousAppState.match(/inactive|background/)) &&
        nextAppState === 'active';

      if (!shouldRecoverApprovals) {
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
              cause: 'musdConversionForegroundRecovery',
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
