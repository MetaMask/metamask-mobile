import { TransactionStatus } from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';

interface UsePredictPayWithAnyTokenTrackingParams {
  transactionId?: string;
}

function getTransactionErrorMessage(
  transactionMeta: {
    error?: unknown;
    errormsg?: unknown;
  } | null,
) {
  const errorMessage =
    typeof transactionMeta?.error === 'object' &&
    transactionMeta?.error &&
    'message' in transactionMeta.error &&
    typeof transactionMeta.error.message === 'string'
      ? transactionMeta.error.message
      : undefined;

  if (errorMessage && errorMessage.trim() !== '') {
    return errorMessage;
  }

  if (
    typeof transactionMeta?.errormsg === 'string' &&
    transactionMeta.errormsg.trim() !== ''
  ) {
    return transactionMeta.errormsg;
  }

  return undefined;
}

export function usePredictPayWithAnyTokenTracking({
  transactionId,
}: UsePredictPayWithAnyTokenTrackingParams) {
  const transactionMeta = useSelector((state: RootState) =>
    transactionId ? selectTransactionMetadataById(state, transactionId) : null,
  );

  const status = transactionMeta?.status;
  const errorMessage = getTransactionErrorMessage(transactionMeta ?? null);

  return useMemo(
    () => ({
      isConfirmed: status === TransactionStatus.confirmed,
      hasFailed:
        status === TransactionStatus.failed ||
        status === TransactionStatus.rejected,
      errorMessage,
    }),
    [errorMessage, status],
  );
}
