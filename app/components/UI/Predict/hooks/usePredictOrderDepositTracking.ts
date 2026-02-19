import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useCallback } from 'react';
import Engine from '../../../../core/Engine';

export function usePredictOrderDepositTracking() {
  const trackDeposit = useCallback(
    ({
      transactionMeta,
      onConfirmed,
      onFailed,
    }: {
      transactionMeta: TransactionMeta;
      onConfirmed: () => void;
      onFailed: () => void;
    }) => {
      const transactionId = transactionMeta.id;

      const handleTransactionConfirmed = ({
        transactionMeta: updated,
      }: {
        transactionMeta: TransactionMeta;
      }) => {
        if (
          updated.id === transactionId &&
          updated.status === TransactionStatus.confirmed
        ) {
          onConfirmed();
        }
      };

      const handleTransactionFailed = ({
        transactionMeta: failedTransactionMeta,
      }: {
        transactionMeta: TransactionMeta;
      }) => {
        if (failedTransactionMeta.id === transactionId) {
          onFailed();
        }
      };

      Engine.controllerMessenger.subscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionConfirmed,
      );

      Engine.controllerMessenger.subscribe(
        'TransactionController:transactionFailed',
        handleTransactionFailed,
      );
    },
    [],
  );

  return { trackDeposit };
}
