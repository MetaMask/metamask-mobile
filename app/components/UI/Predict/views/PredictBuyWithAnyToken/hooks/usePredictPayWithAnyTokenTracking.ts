import { TransactionStatus } from '@metamask/transaction-controller';
import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectTransactionsByBatchId } from '../../../../../../selectors/transactionController';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PredictNavigationParamList } from '../../../types/navigation';
import { PREDICTION_ERROR_TRANSACTION_BATCH_ID } from '../../../constants/transactions';

interface UsePredictPayWithAnyTokenTrackingParams {
  onConfirm?: () => void;
  onFail?: (errorMessage?: string) => void;
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
  onConfirm,
  onFail,
}: UsePredictPayWithAnyTokenTrackingParams) {
  const hasCalledConfirmRef = useRef(false);
  const hasCalledFailRef = useRef(false);

  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { isConfirmation } = route.params;

  const { activeOrder } = usePredictActiveOrder();

  const batchId = useMemo(() => activeOrder?.batchId, [activeOrder?.batchId]);
  const error = useMemo(() => activeOrder?.error, [activeOrder?.error]);

  const trackedBatchIdRef = useRef<string | undefined>(batchId);

  const transactions = useSelector((state: RootState) =>
    batchId ? selectTransactionsByBatchId(state, batchId) : null,
  );

  const transactionMeta = useMemo(() => transactions?.[0], [transactions]);

  const status = transactionMeta?.status;
  const errorMessage = getTransactionErrorMessage(transactionMeta ?? null);
  const isConfirmed = status === TransactionStatus.confirmed;
  const isControllerError =
    !!error && batchId === PREDICTION_ERROR_TRANSACTION_BATCH_ID;
  const isFailed =
    isControllerError ||
    status === TransactionStatus.failed ||
    status === TransactionStatus.rejected;

  const isProcessing =
    status === TransactionStatus.signed ||
    status === TransactionStatus.submitted;

  useEffect(() => {
    if (trackedBatchIdRef.current === batchId) {
      return;
    }

    trackedBatchIdRef.current = batchId;
    hasCalledConfirmRef.current = false;
    hasCalledFailRef.current = false;
  }, [batchId]);

  useEffect(() => {
    if (!batchId || !isConfirmed || !onConfirm || hasCalledConfirmRef.current) {
      return;
    }

    hasCalledConfirmRef.current = true;
    onConfirm();
  }, [batchId, isConfirmed, onConfirm]);

  useEffect(() => {
    if (isFailed && !hasCalledFailRef.current && onFail) {
      hasCalledFailRef.current = true;
      onFail(error ?? errorMessage);
    }
  }, [batchId, isFailed, onFail, error, errorMessage, isConfirmation]);

  return {
    isConfirmed,
    isFailed,
    errorMessage,
    isProcessing,
    status,
  };
}
