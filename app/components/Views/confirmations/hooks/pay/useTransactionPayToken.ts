import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import type { CaipAssetType } from '@metamask/utils';
import { noop } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import { RootState } from '../../../../../reducers';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { decodeEvmAssetId } from '../../../../../util/transactions/payment-token';
import { syncMoneyAccountWithdrawTransfer } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import Logger from '../../../../../util/Logger';

/** Payment token selection, identified by its `AssetsController` asset ID. */
export interface PayTokenSelection {
  assetId: CaipAssetType;
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
  payToken: TransactionPaymentToken | undefined;
  setPayToken: (selection: PayTokenSelection) => void;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { id: transactionId } = transactionMeta || { id: '' };

  const payToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  const payTokenAsset = useMemo(
    () => payToken && decodeEvmAssetId(payToken.assetId),
    [payToken],
  );

  const requiredTokens = useTransactionPayRequiredTokens();
  const primaryRequiredToken = (requiredTokens ?? []).find(
    (token) => !token.skipIfBalance,
  );

  const isNative =
    payTokenAsset &&
    payTokenAsset.address === getNativeTokenAddress(payTokenAsset.chainId);

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  // The current token is non-EVM when it is selected but has no EVM chain.
  const isNonEvmPayTokenSelected = Boolean(payToken) && !payTokenAsset;

  const setPayToken = useCallback(
    ({ assetId }: PayTokenSelection) => {
      const newPayToken = decodeEvmAssetId(assetId);
      const isNonEvmSource = !newPayToken;

      // Switching to or from a non-EVM source on a Money Account deposit
      // reconfigures its vault second leg.
      if (
        isMoneyAccountDeposit &&
        (isNonEvmSource || isNonEvmPayTokenSelected)
      ) {
        setMoneyAccountDepositNonEvmSource(transactionId, isNonEvmSource);
      }

      // Gas fee estimates and the predict gas fee token only apply to EVM
      // sources. Core resolves a non-EVM source from the account in the
      // transaction account group that supports its chain.
      if (newPayToken) {
        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            newPayToken.chainId,
          );

        Engine.context.GasFeeController.fetchGasFeeEstimates({
          networkClientId,
        }).catch(noop);
      }

      try {
        Engine.context.TransactionPayController.updatePaymentToken({
          transactionId: transactionId as string,
          assetId,
        });

        if (newPayToken) {
          syncMoneyAccountWithdrawTransfer(transactionMeta, newPayToken);
        }
      } catch (error) {
        Logger.error(error as Error, 'Error updating payment token');
      }

      // perps deposits only use relay, so doesn't need gasFeeToken update
      const isPredictDepositTransaction = hasTransactionType(transactionMeta, [
        TransactionType.predictDeposit,
        TransactionType.predictDepositAndOrder,
      ]);

      if (newPayToken && isPredictDepositTransaction && transactionMeta) {
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
      isNonEvmPayTokenSelected,
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
