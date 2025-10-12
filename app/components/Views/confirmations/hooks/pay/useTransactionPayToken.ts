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
    (newPayToken: { address: Hex; chainId: Hex }) => {
      const { TransactionPayController } = Engine.context;

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
