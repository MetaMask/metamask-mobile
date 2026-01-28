import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { noop } from 'lodash';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { RootState } from '../../../../../reducers';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { hasTransactionType } from '../../utils/transaction';

export function useTransactionPayToken(): {
  isNative?: boolean;
  payToken: TransactionPaymentToken | undefined;
  setPayToken: (newPayToken: { address: Hex; chainId: Hex }) => void;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { id: transactionId } = transactionMeta || { id: '' };

  const payToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const requiredTokens = useTransactionPayRequiredTokens();
  const primaryRequiredToken = (requiredTokens ?? []).find(
    (token) => !token.skipIfBalance,
  );

  const isNative =
    payToken && payToken?.address === getNativeTokenAddress(payToken?.chainId);

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
      } catch (e) {
        console.error('Error updating payment token', e);
      }

      // perps deposits only use relay, so doesn't need gasFeeToken update
      const isPredictDepositTransaction = hasTransactionType(transactionMeta, [
        TransactionType.predictDeposit,
      ]);
      const isPerpsDepositTransaction = hasTransactionType(transactionMeta, [
        TransactionType.perpsDeposit,
      ]);

      if (isPredictDepositTransaction && transactionMeta) {
        const isNewPayTokenRequiredToken =
          newPayToken.chainId === primaryRequiredToken?.chainId &&
          newPayToken.address.toLowerCase() ===
            primaryRequiredToken?.address.toLowerCase();

        const updatedTx: TransactionMeta = {
          ...transactionMeta,
          selectedGasFeeToken: isNewPayTokenRequiredToken
            ? newPayToken.address
            : undefined,
          isGasFeeTokenIgnoredIfBalance: isNewPayTokenRequiredToken
            ? true
            : undefined,
        };

        updateTransaction(updatedTx, transactionMeta.id);
      } else if (isPerpsDepositTransaction) {
        // No selectedGasFeeToken update for perps deposits.
      }

      EngineService.flushState();
    },
    [
      transactionId,
      transactionMeta,
      primaryRequiredToken?.chainId,
      primaryRequiredToken?.address,
    ],
  );

  return {
    isNative,
    payToken,
    setPayToken,
  };
}
