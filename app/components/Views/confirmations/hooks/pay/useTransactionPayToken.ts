import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback } from 'react';
import { RootState } from '../../../../../reducers';
import Engine from '../../../../../core/Engine';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { Hex } from '@metamask/utils';

export function useTransactionPayToken() {
  const { id: transactionId } = useTransactionMetadataRequest() || { id: '' };

  const payToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const setPayToken = useCallback(
    async (newPayToken: { address: Hex; chainId: Hex }) => {
      const { GasFeeController, NetworkController, TransactionPayController } =
        Engine.context;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        newPayToken.chainId,
      );

      await GasFeeController.fetchGasFeeEstimates({
        networkClientId,
      });

      try {
        TransactionPayController.updatePaymentToken({
          transactionId: transactionId as string,
          tokenAddress: newPayToken.address,
          chainId: newPayToken.chainId,
        });
      } catch (e) {
        console.error('Error updating payment token', e);
      }
    },
    [transactionId],
  );

  return {
    payToken,
    setPayToken,
  };
}
