import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPendingApprovals } from '../../../selectors/approvalController';
import { selectTransactionMetadataById } from '../../../selectors/transactionController';
import type { RootState } from '../../../reducers';
import {
  HardwareWalletAnalyticsFlow,
  getAnalyticsFlowFromApproval,
} from './helpers';

/**
 * Derives the current analytics flow from the first pending approval in the
 * Redux store. Returns `Connection` when no approval is pending (e.g. during
 * account creation). Used by `HardwareWalletProvider` to automatically set
 * the analytics flow context when `ensureDeviceReady` is called.
 */
export function useAnalyticsFlowFromApproval(): HardwareWalletAnalyticsFlow {
  const pendingApprovals = useSelector(selectPendingApprovals);
  const firstApproval = Object.values(pendingApprovals ?? {})[0];
  const transactionMetadata = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, firstApproval?.id ?? ''),
  );

  return useMemo(
    () =>
      getAnalyticsFlowFromApproval({
        approvalType: firstApproval?.type,
        transactionType: transactionMetadata?.type,
      }),
    [firstApproval?.type, transactionMetadata?.type],
  );
}
