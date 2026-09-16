import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { noop } from 'lodash';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { RootState } from '../../../../../reducers';
import {
  selectTransactionPayIsMaxAmountByTransactionId,
  selectTransactionPaymentTokenByTransactionId,
} from '../../../../../selectors/transactionPayController';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { getAtomicHintForMoneyDeposit } from '../../utils/transaction-pay';
import { isMoneyDepositFeeSubsidized } from '../../../../../components/UI/Money/utils/isMoneyDepositFeeSubsidized';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import Logger from '../../../../../util/Logger';

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
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const isMaxAmount = useSelector((state: RootState) =>
    selectTransactionPayIsMaxAmountByTransactionId(state, transactionId),
  );
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

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
      } catch (error) {
        Logger.error(error as Error, 'Error updating payment token');
      }

      if (isMoneyAccountDeposit) {
        TransactionPayController.setTransactionConfig(
          transactionId as string,
          (config) => {
            config.atomic = getAtomicHintForMoneyDeposit({
              isMaxAmount: isMaxAmount ?? false,
              isSubsidized: isMoneyDepositFeeSubsidized(
                relayFixedSpread,
                newPayToken,
              ),
            });
          },
        );
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
      isMoneyAccountDeposit,
      isMaxAmount,
      relayFixedSpread,
    ],
  );

  return {
    isNative,
    payToken,
    setPayToken,
  };
}
