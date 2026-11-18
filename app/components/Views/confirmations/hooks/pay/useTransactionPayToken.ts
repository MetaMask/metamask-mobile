import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { Hex } from '@metamask/utils';
import { noop } from 'lodash';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { RootState } from '../../../../../reducers';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { syncMoneyAccountWithdrawTransfer } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import Logger from '../../../../../util/Logger';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { getPayTokenAddressAndChainId } from '../../utils/transaction-pay';

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

  const payTokenInfo = getPayTokenAddressAndChainId(payToken);
  const isNative =
    payTokenInfo &&
    payTokenInfo.address === getNativeTokenAddress(payTokenInfo.chainId);

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
        const caipChainId = toEvmCaipChainId(newPayToken.chainId);
        const assetId = toAssetId(newPayToken.address, caipChainId);

        if (!assetId) {
          throw new Error(
            `Failed to convert address ${newPayToken.address} and chainId ${newPayToken.chainId} to CAIP-19 asset ID`,
          );
        }

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
