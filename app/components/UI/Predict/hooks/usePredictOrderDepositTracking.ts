import { TransactionStatus } from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';

interface UsePredictOrderDepositTrackingParams {
  transactionId?: string;
}

export function usePredictOrderDepositTracking({
  transactionId,
}: UsePredictOrderDepositTrackingParams) {
  const transactionMeta = useSelector((state: RootState) =>
    transactionId ? selectTransactionMetadataById(state, transactionId) : null,
  );

  const status = transactionMeta?.status;

  return useMemo(
    () => ({
      isConfirmed: status === TransactionStatus.confirmed,
      hasFailed:
        status === TransactionStatus.failed ||
        status === TransactionStatus.rejected,
    }),
    [status],
  );
}
