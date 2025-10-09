import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import { Alert } from 'react-native';
import { addTransaction } from '../../../../util/transaction-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { usePredictAccountState } from './usePredictAccountState';

interface UsePredictEnableWalletParams {
  providerId?: string;
  onSuccess?: () => void;
}

interface TransactionParams {
  from: Hex;
  to: Hex;
  data: Hex;
}

export const usePredictEnableWallet = ({
  providerId = 'polymarket',
  onSuccess,
}: UsePredictEnableWalletParams = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { isDeployed } = usePredictAccountState({ providerId });

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

  // TODO: We need to change to execute the transactions in the controller
  const executeTransactions = useCallback(
    async ({
      transactions,
      chainId,
    }: {
      transactions: TransactionParams[];
      chainId: Hex;
    }) => {
      const { NetworkController } = Engine.context;

      const currentTransaction = transactions[0];

      const { transactionMeta: currentTransactionMeta } = await addTransaction(
        {
          ...currentTransaction,
        },
        {
          networkClientId:
            NetworkController.findNetworkClientIdByChainId(chainId),
          requireApproval: false,
          type: TransactionType.contractInteraction,
        },
      );

      const nextTransaction = transactions[1];

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        async (transactionMeta) => {
          if (transactionMeta.id === currentTransactionMeta.id) {
            if (nextTransaction) {
              await executeTransactions({
                transactions: [nextTransaction],
                chainId,
              });
            } else {
              setIsLoading(false);
              setIsSuccess(true);
            }
          }
        },
        (transactionMeta) => transactionMeta.id === currentTransactionMeta.id,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setError('Failed to enable wallet. Please try again.');
          setIsLoading(false);
        },
        ({ transactionMeta }) =>
          transactionMeta.id === currentTransactionMeta.id,
      );
    },
    [],
  );

  const enableWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { PredictController } = Engine.context;
      const { response } = await PredictController.enableWallet({
        providerId,
      });

      console.log('response', response);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable wallet');
      setIsLoading(false);
    }
  }, [providerId]);

  return {
    isLoading,
    error,
    isSuccess,
    enableWallet,
  };
};
