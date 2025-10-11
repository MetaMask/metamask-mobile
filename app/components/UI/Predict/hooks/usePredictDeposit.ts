import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import { Alert } from 'react-native';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import Routes from '../../../../constants/navigation/Routes';

interface UsePredictDepositParams {
  providerId?: string;
  onSuccess?: () => void;
}

export const usePredictDeposit = ({
  providerId = 'polymarket',
  onSuccess,
}: UsePredictDepositParams = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess] = useState(false);
  const { navigateToConfirmation } = useConfirmNavigation();

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess) {
      Alert.alert('Success', 'Wallet enabled successfully');
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const deposit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PREDICT.ROOT,
      });
      const { PredictController } = Engine.context;
      await PredictController.depositWithConfirmation({
        providerId,
      });
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable wallet');
      setIsLoading(false);
    }
  }, [navigateToConfirmation, providerId]);

  return {
    isLoading,
    error,
    isSuccess,
    deposit,
  };
};
