import { isEqual } from 'lodash';
import type {
  TransactionController,
  TransactionControllerState,
  TransactionMeta,
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  FeeMarketGasFeeEstimates,
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  GasPriceGasFeeEstimates,
  LegacyGasFeeEstimates,
  TransactionStatus,
  TransactionEnvelopeType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { REDESIGNED_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/hooks/useConfirmationRedesignEnabled';

export function handleTxParamsGasFeeUpdatesForRedesignedTransactions(
  transactionsToUpdate: Partial<TransactionMeta>[],
  updateTransactionGasFees: TransactionController['updateTransactionGasFees'],
) {
  transactionsToUpdate.map((tx) => {
    const txMeta = tx as Required<
      Pick<
        TransactionMeta,
        'gasFeeEstimates' | 'userFeeLevel' | 'txParams' | 'id'
      >
    >;
    const userFeeLevel = txMeta.userFeeLevel as GasFeeEstimateLevel;
    const gasFeeEstimates = txMeta.gasFeeEstimates;
    const { txParams } = txMeta;
    const { type: gasEstimateType } = gasFeeEstimates;

    const gasValuesToUpdate = {
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
      gasPrice: undefined,
    } as {
      maxFeePerGas?: Hex;
      maxPriorityFeePerGas?: Hex;
      gasPrice?: Hex;
    };

    const isEIP1559Compatible =
      txParams.type !== TransactionEnvelopeType.legacy;

    if (isEIP1559Compatible) {
      // Handle EIP-1559 compatible transactions
      if (gasEstimateType === GasFeeEstimateType.FeeMarket) {
        const feeMarketGasFeeEstimates =
          gasFeeEstimates as FeeMarketGasFeeEstimates;

        gasValuesToUpdate.maxFeePerGas =
          feeMarketGasFeeEstimates[userFeeLevel].maxFeePerGas;
        gasValuesToUpdate.maxPriorityFeePerGas =
          feeMarketGasFeeEstimates[userFeeLevel].maxPriorityFeePerGas;
      }

      if (gasEstimateType === GasFeeEstimateType.GasPrice) {
        const gasPriceGasFeeEstimates =
          gasFeeEstimates as GasPriceGasFeeEstimates;

        gasValuesToUpdate.maxFeePerGas = gasPriceGasFeeEstimates.gasPrice;
        gasValuesToUpdate.maxPriorityFeePerGas =
          gasPriceGasFeeEstimates.gasPrice;
      }

      if (gasEstimateType === GasFeeEstimateType.Legacy) {
        const legacyGasFeeEstimates = gasFeeEstimates as LegacyGasFeeEstimates;
        const gasPrice = legacyGasFeeEstimates[userFeeLevel];

        gasValuesToUpdate.maxFeePerGas = gasPrice;
        gasValuesToUpdate.maxPriorityFeePerGas = gasPrice;
      }
    } else {
      // Handle non-EIP-1559 transactions
      if (gasEstimateType === GasFeeEstimateType.FeeMarket) {
        const feeMarketGasFeeEstimates =
          gasFeeEstimates as FeeMarketGasFeeEstimates;
        gasValuesToUpdate.gasPrice =
          feeMarketGasFeeEstimates[userFeeLevel].maxFeePerGas;
      }

      if (gasEstimateType === GasFeeEstimateType.GasPrice) {
        const gasPriceGasFeeEstimates =
          gasFeeEstimates as GasPriceGasFeeEstimates;
        gasValuesToUpdate.gasPrice = gasPriceGasFeeEstimates.gasPrice;
      }

      if (gasEstimateType === GasFeeEstimateType.Legacy) {
        const legacyGasFeeEstimates = gasFeeEstimates as LegacyGasFeeEstimates;
        gasValuesToUpdate.gasPrice = legacyGasFeeEstimates[userFeeLevel];
      }
    }

    updateTransactionGasFees(txMeta.id, gasValuesToUpdate);
  });
}

// This selector is used to get the unapproved transactions from the controller state
// It checks if gasFeeEstimates are updated for unapproved transactions
export function createUnapprovedTransactionsGasFeeSelector() {
  let prevTxsNeedsUpdate = [] as Partial<TransactionMeta>[];

  return (controllerState: TransactionControllerState) => {
    const txsNeedsUpdate = controllerState.transactions
      .filter(
        (txMeta: TransactionMeta) =>
          txMeta.status === TransactionStatus.unapproved,
      )
      .filter((txMeta: TransactionMeta) =>
        REDESIGNED_TRANSACTION_TYPES.includes(txMeta.type as TransactionType),
      )
      .filter((txMeta: TransactionMeta) => {
        const userFeeLevel = txMeta.userFeeLevel as GasFeeEstimateLevel;
        return Object.values(GasFeeEstimateLevel).includes(userFeeLevel);
      })
      .filter((txMeta: TransactionMeta) => {
        const gasFeeEstimates = txMeta.gasFeeEstimates;
        return gasFeeEstimates !== undefined;
      })
      .map((txMeta: TransactionMeta) => ({
        id: txMeta.id,
        gasFeeEstimates: txMeta.gasFeeEstimates,
        txParams: {
          type: txMeta.txParams.type,
        } as TransactionParams,
        userFeeLevel: txMeta.userFeeLevel,
      }));

    if (isEqual(txsNeedsUpdate, prevTxsNeedsUpdate)) {
      return prevTxsNeedsUpdate;
    }

    prevTxsNeedsUpdate = txsNeedsUpdate;
    return prevTxsNeedsUpdate as Partial<TransactionMeta>[];
  };
}
