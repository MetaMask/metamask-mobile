import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { noop } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { RootState } from '../../../../../reducers';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { updateTransaction } from '../../../../../util/transaction-controller';
import {
  EvmPaymentToken,
  getEvmPaymentToken,
  getEvmPaymentTokenAssetId,
} from '../../../../../util/transactions/payment-token';
import { syncMoneyAccountWithdrawTransfer } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import Logger from '../../../../../util/Logger';

export function useTransactionPayToken(): {
  isNative?: boolean;
  payToken: EvmPaymentToken | undefined;
  setPayToken: (newPayToken: { address: Hex; chainId: Hex }) => void;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { id: transactionId } = transactionMeta || { id: '' };

  const paymentToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const payToken = useMemo(
    () => getEvmPaymentToken(paymentToken),
    [paymentToken],
  );

  const requiredTokens = useTransactionPayRequiredTokens();
  const primaryRequiredToken = (requiredTokens ?? []).find(
    (token) => !token.skipIfBalance,
  );

  const isNative =
    payToken && payToken?.address === getNativeTokenAddress(payToken?.chainId);

  const setPayToken = useCallback(
    (newPayToken: { address: Hex; chainId: Hex }) => {
      const {
        AssetsController,
        GasFeeController,
        NetworkController,
        TransactionPayController,
      } = Engine.context;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        newPayToken.chainId,
      );

      GasFeeController.fetchGasFeeEstimates({
        networkClientId,
      }).catch(noop);

      try {
        TransactionPayController.updatePaymentToken({
          transactionId: transactionId as string,
          assetId: getEvmPaymentTokenAssetId(
            newPayToken,
            AssetsController.state.assetsInfo,
          ),
        });

        syncMoneyAccountWithdrawTransfer(transactionMeta, newPayToken);
      } catch (error) {
        Logger.error(error as Error, 'Error updating payment token');
      }

      // perps deposits only use relay, so doesn't need gasFeeToken update
      const isPredictDepositTransaction = hasTransactionType(transactionMeta, [
        TransactionType.predictDeposit,
        TransactionType.predictDepositAndOrder,
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
