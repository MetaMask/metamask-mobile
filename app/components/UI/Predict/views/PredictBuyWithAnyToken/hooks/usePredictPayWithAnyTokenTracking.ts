import { TransactionStatus } from '@metamask/transaction-controller';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectTransactionMetadataById } from '../../../../../../selectors/transactionController';

interface UsePredictPayWithAnyTokenTrackingParams {
  transactionId?: string;
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
  transactionId,
  onConfirm,
  onFail,
}: UsePredictPayWithAnyTokenTrackingParams) {
  const trackedTransactionIdRef = useRef<string | undefined>(transactionId);
  const hasCalledConfirmRef = useRef(false);
  const hasCalledFailRef = useRef(false);

  const transactionMeta = useSelector((state: RootState) =>
    transactionId ? selectTransactionMetadataById(state, transactionId) : null,
  );

  const status = transactionMeta?.status;
  const errorMessage = getTransactionErrorMessage(transactionMeta ?? null);
  const isConfirmed = status === TransactionStatus.confirmed;
  const isFailed =
    status === TransactionStatus.failed ||
    status === TransactionStatus.rejected;
  const isProcessing =
    status === TransactionStatus.signed ||
    status === TransactionStatus.submitted;

  useEffect(() => {
    if (trackedTransactionIdRef.current === transactionId) {
      return;
    }

    trackedTransactionIdRef.current = transactionId;
    hasCalledConfirmRef.current = false;
    hasCalledFailRef.current = false;
  }, [transactionId]);

  useEffect(() => {
    if (
      !transactionId ||
      !isConfirmed ||
      !onConfirm ||
      hasCalledConfirmRef.current
    ) {
      return;
    }

    hasCalledConfirmRef.current = true;
    onConfirm();
  }, [isConfirmed, onConfirm, transactionId]);

  useEffect(() => {
    if (!transactionId || !isFailed || !onFail || hasCalledFailRef.current) {
      return;
    }

    hasCalledFailRef.current = true;
    onFail(errorMessage);
  }, [isFailed, onFail, errorMessage, transactionId]);

  return {
    isConfirmed,
    isFailed,
    errorMessage,
    isProcessing,
    status,
  };
}
