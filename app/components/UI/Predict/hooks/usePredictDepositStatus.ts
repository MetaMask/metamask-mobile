import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPredictDepositTransaction } from '../selectors/predictController';
import { PredictDepositStatus } from '../types';

interface UsePredictDepositStatusParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const usePredictDepositStatus = ({
  onSuccess,
  onError,
}: UsePredictDepositStatusParams = {}) => {
  const depositTransaction = useSelector(selectPredictDepositTransaction);
  const previousStatusRef = useRef<PredictDepositStatus | null>(null);

  useEffect(() => {
    if (!depositTransaction) {
      previousStatusRef.current = null;
      return;
    }

    const currentStatus = depositTransaction.status;
    const previousStatus = previousStatusRef.current;

    if (currentStatus === previousStatus) {
      return;
    }

    previousStatusRef.current = currentStatus;

    if (currentStatus === PredictDepositStatus.CONFIRMED) {
      Alert.alert('Deposit Successful', 'Your funds are now available');
      onSuccess?.();
      Engine.context.PredictController.clearDepositTransaction();
    } else if (currentStatus === PredictDepositStatus.ERROR) {
      const errorMessage = 'Failed to complete deposit';
      Alert.alert('Deposit Failed', errorMessage);
      onError?.(new Error(errorMessage));
      Engine.context.PredictController.clearDepositTransaction();
    } else if (currentStatus === PredictDepositStatus.CANCELLED) {
      Engine.context.PredictController.clearDepositTransaction();
    }
  }, [depositTransaction, onSuccess, onError]);
};
