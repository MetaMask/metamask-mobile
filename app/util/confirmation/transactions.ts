/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  GAS_ESTIMATE_TYPES,
  GasEstimateType,
} from '@metamask/gas-fee-controller';
import {
  TransactionEnvelopeType,
  TransactionParams,
} from '@metamask/transaction-controller';
import {
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';
import { addHexPrefix, safeBNToHex } from '../number';
import { safeToChecksumAddress } from '../address';
import { strings } from '../../../locales/i18n';

export function buildTransactionParams({
  gasDataEIP1559,
  gasDataLegacy,
  gasEstimateType,
  transaction,
}: {
  gasDataEIP1559: any;
  gasDataLegacy: any;
  gasEstimateType: GasEstimateType;
  transaction: any;
}): TransactionParams {
  const transactionParams: TransactionParams = { ...transaction };
  const { nonce, value } = transaction;
  const { type } = transactionParams;

  transactionParams.from = safeToChecksumAddress(transaction.from) as string;
  transactionParams.nonce = safeBNToHex(nonce);
  transactionParams.to = safeToChecksumAddress(transaction.to);
  transactionParams.value = safeBNToHex(value);

  if (
    gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET &&
    type !== TransactionEnvelopeType.legacy
  ) {
    const {
      estimatedBaseFeeHex,
      gasLimitHex,
      suggestedMaxFeePerGasHex,
      suggestedMaxPriorityFeePerGasHex,
    } = gasDataEIP1559;

    transactionParams.gas = addHexPrefix(gasLimitHex);
    transactionParams.gasPrice = undefined;
    transactionParams.maxFeePerGas = addHexPrefix(suggestedMaxFeePerGasHex);
    transactionParams.maxPriorityFeePerGas = addHexPrefix(
      suggestedMaxPriorityFeePerGasHex,
    );
    transactionParams.estimatedBaseFee = addHexPrefix(estimatedBaseFeeHex);
  } else {
    const { suggestedGasLimitHex, suggestedGasPriceHex } = gasDataLegacy;

    transactionParams.gas = addHexPrefix(suggestedGasLimitHex);
    transactionParams.gasPrice = addHexPrefix(suggestedGasPriceHex);
    transactionParams.maxFeePerGas = undefined;
    transactionParams.maxPriorityFeePerGas = undefined;
  }

  return transactionParams;
}

/**
 * Resolves a user-facing message for speed-up / cancel failures.
 *
 * @param error - Thrown value from speed-up or cancel flow
 * @returns Message to show in toast, or undefined if no message is available
 */
export function resolveTransactionUpdateErrorMessage(
  error: unknown,
): string | undefined {
  const raw = error instanceof Error ? error.message : undefined;
  if (!raw) {
    return undefined;
  }
  if (raw.toLowerCase().includes('nonce too low')) {
    return strings('transaction_update_toast.already_confirmed');
  }
  return raw;
}

/**
 * Toast configuration for speed-up / cancel failures (legacy Transactions list and unified view).
 *
 * @param error - Thrown value from speed-up or cancel flow
 * @returns Options for the MMDS `toast()` API.
 */
export function getTransactionUpdateErrorToastOptions(
  error: unknown,
): ToastOptions {
  const description = resolveTransactionUpdateErrorMessage(error);
  const title =
    strings('transaction_update_toast.title') || 'Transaction update failed';
  return {
    title,
    ...(description !== undefined && { description }),
    severity: ToastSeverity.Danger,
    hasNoTimeout: false,
    showCloseButton: false,
  };
}

/**
 * Toast configuration for amount-update failures on the Money Account confirmation screen.
 * Persists until explicitly dismissed by the user.
 *
 * @param error - Thrown value from the amount-update flow
 * @param onClose - Callback invoked when the user presses the dismiss button.
 * @returns Options for the MMDS `toast()` API.
 */
export function getAmountUpdateErrorToastOptions(
  error: unknown,
  onClose: () => void,
): ToastOptions {
  const description = resolveTransactionUpdateErrorMessage(error);
  return {
    title: strings('transaction_update_toast.amount_update_title'),
    ...(description !== undefined && { description }),
    severity: ToastSeverity.Danger,
    hasNoTimeout: true,
    onClose,
  };
}
