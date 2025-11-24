import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback } from 'react';
import { RootState } from '../../../../../reducers';
import Engine from '../../../../../core/Engine';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { Hex } from '@metamask/utils';
import { noop } from 'lodash';
import EngineService from '../../../../../core/EngineService';

export function useTransactionPayToken() {
  const { id: transactionId } = useTransactionMetadataRequest() || { id: '' };

  const payToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const setPayToken = useCallback(
    (newPayToken: { address: Hex; chainId: Hex }) => {
      const { GasFeeController, NetworkController, TransactionPayController } =
        Engine.context;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        newPayToken.chainId,
      );

      GasFeeController.fetchGasFeeEstimates({
        networkClientId,
      }).catch(noop);

      try {
        TransactionPayController.updatePaymentToken({
          transactionId: transactionId as string,
          tokenAddress: newPayToken.address,
          chainId: newPayToken.chainId,
        });

        EngineService.flushState();
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
