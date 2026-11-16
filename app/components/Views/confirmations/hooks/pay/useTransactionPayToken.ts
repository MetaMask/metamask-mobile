import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import type { CaipAssetType } from '@metamask/utils';
import { noop } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { RootState } from '../../../../../reducers';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { getEvmAsset } from '../../../../../util/transactions/payment-token';
import { syncMoneyAccountWithdrawTransfer } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import Logger from '../../../../../util/Logger';

/** Payment token selection, identified by its `AssetsController` asset ID. */
export interface PayTokenSelection {
  assetId: CaipAssetType;
}

export function useTransactionPayToken(): {
  isNative?: boolean;
  payToken: TransactionPaymentToken | undefined;
  setPayToken: (selection: PayTokenSelection) => void;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { id: transactionId } = transactionMeta || { id: '' };

  const payToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const payTokenAsset = useMemo(
    () => payToken && getEvmAsset(payToken.assetId),
    [payToken],
  );

  const requiredTokens = useTransactionPayRequiredTokens();
  const primaryRequiredToken = (requiredTokens ?? []).find(
    (token) => !token.skipIfBalance,
  );

  const isNative =
    payTokenAsset &&
    payTokenAsset.address === getNativeTokenAddress(payTokenAsset.chainId);

  const setPayToken = useCallback(
    ({ assetId }: PayTokenSelection) => {
      // Mobile only offers EVM payment tokens.
      const newPayToken = getEvmAsset(assetId);

      if (!newPayToken) {
        throw new Error(`Unsupported payment token: ${assetId}`);
      }

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
          assetId,
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
