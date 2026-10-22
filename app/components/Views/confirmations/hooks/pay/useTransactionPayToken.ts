import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  EvmPaymentToken,
  NonEvmPaymentToken,
  PaymentOverride,
  TransactionPaymentToken,
  isNonEvmPaymentToken,
} from '@metamask/transaction-pay-controller';
import { CaipAssetType, Hex } from '@metamask/utils';
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
import Logger from '../../../../../util/Logger';

export interface SetNonEvmPayTokenRequest {
  /** CAIP-19 asset type of the non-EVM token. */
  assetId: CaipAssetType;
  /** ID of the `InternalAccount` holding the token. */
  walletAccountId: string;
}

/**
 * Configures a Money Account deposit for a non-EVM source, or clears that
 * configuration when switching back to an EVM token.
 *
 * Core runs the vault deposit as a non-atomic second leg only for a request
 * with the Money Account override and `atomic: false`, so it must be set before
 * the non-EVM token is selected for the first quote to include it. An armed Max
 * deposit keeps its own atomic hint (see `useTransactionCustomAmount`).
 *
 * @param transactionId - ID of the Money Account deposit.
 * @param isNonEvmSource - Whether the newly selected payment token is non-EVM.
 */
function setMoneyAccountDepositNonEvmSource(
  transactionId: string,
  isNonEvmSource: boolean,
): void {
  Engine.context.TransactionPayController.setTransactionConfig(
    transactionId,
    (config) => {
      config.paymentOverride = isNonEvmSource
        ? PaymentOverride.MoneyAccount
        : undefined;

      if (isNonEvmSource || !config.isMaxAmount) {
        config.atomic = isNonEvmSource ? false : undefined;
      }
    },
  );
}

export function useTransactionPayToken(): {
  isNative?: boolean;
  /** Selected payment token when it is an EVM token. */
  payToken: EvmPaymentToken | undefined;
  /** Selected payment token when it is a non-EVM token, such as Solana. */
  nonEvmPayToken?: NonEvmPaymentToken;
  setPayToken: (newPayToken: { address: Hex; chainId: Hex }) => void;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { id: transactionId } = transactionMeta || { id: '' };

  const paymentToken: TransactionPaymentToken | undefined = useSelector(
    (state: RootState) =>
      selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const nonEvmPayToken =
    paymentToken && isNonEvmPaymentToken(paymentToken)
      ? paymentToken
      : undefined;

  const payToken =
    paymentToken && !isNonEvmPaymentToken(paymentToken)
      ? paymentToken
      : undefined;

  const requiredTokens = useTransactionPayRequiredTokens();
  const primaryRequiredToken = (requiredTokens ?? []).find(
    (token) => !token.skipIfBalance,
  );

  const isNative =
    payToken && payToken?.address === getNativeTokenAddress(payToken?.chainId);

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const setPayToken = useCallback(
    (newPayToken: { address: Hex; chainId: Hex }) => {
      const { GasFeeController, NetworkController, TransactionPayController } =
        Engine.context;

      if (isMoneyAccountDeposit && nonEvmPayToken) {
        setMoneyAccountDepositNonEvmSource(transactionId as string, false);
      }

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
      isMoneyAccountDeposit,
      nonEvmPayToken,
      transactionId,
      transactionMeta,
      primaryRequiredToken?.chainId,
      primaryRequiredToken?.address,
    ],
  );

  return {
    isNative,
    nonEvmPayToken,
    payToken,
    setPayToken,
  };
}

/**
 * Selects a non-EVM payment token, such as Solana SOL or an SPL token, on the
 * current transaction by CAIP-19 asset type and wallet account. Core resolves
 * the balance, quotes and submission.
 *
 * @returns Callback that selects the non-EVM payment token.
 */
export function useSetNonEvmPayToken(): (
  request: SetNonEvmPayTokenRequest,
) => void {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  return useCallback(
    ({ assetId, walletAccountId }: SetNonEvmPayTokenRequest) => {
      if (isMoneyAccountDeposit) {
        setMoneyAccountDepositNonEvmSource(transactionId, true);
      }

      try {
        Engine.context.TransactionPayController.updatePaymentToken({
          transactionId,
          assetId,
          walletAccountId,
        });
      } catch (error) {
        Logger.error(error as Error, 'Error updating payment token');
      }

      EngineService.flushState();
    },
    [isMoneyAccountDeposit, transactionId],
  );
}
