import type {
  TransactionParams,
  FeeMarketGasFeeEstimates,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { estimateGasFee } from '../../../../util/transaction-controller';
import { addHexPrefix } from '../../../../util/number/legacy';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import AppConstants from '../../../../core/AppConstants';

export const DEFAULT_GAS_FEE_OPTION_LEGACY = AppConstants.GAS_OPTIONS.MEDIUM;
export const DEFAULT_GAS_FEE_OPTION_FEE_MARKET = AppConstants.GAS_OPTIONS.HIGH;

export async function getTransaction1559GasFeeEstimates(
  transactionParams: TransactionParams,
  chainId: Hex,
) {
  const transactionGasFeeResponse = await estimateGasFee({
    transactionParams,
    chainId,
  });

  const transactionGasFeeEstimates = transactionGasFeeResponse?.estimates as
    | FeeMarketGasFeeEstimates
    | undefined;

  const { maxFeePerGas } = transactionGasFeeEstimates?.high ?? {};
  const { maxPriorityFeePerGas } = transactionGasFeeEstimates?.high ?? {};

  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

export async function getGasFeeEstimatesForTransaction(
  transaction: Partial<TransactionParams> & { from: string; chainId: string },
  gasEstimates: {
    gasPrice?: string;
    medium: string;
  },
  { chainId, isEIP1559Network }: { chainId: Hex; isEIP1559Network: boolean },
) {
  if (isEIP1559Network) {
    const transactionGasFeeEstimates = await getTransaction1559GasFeeEstimates(
      transaction,
      chainId,
    );
    delete transaction.gasPrice;
    return transactionGasFeeEstimates;
  }

  return {
    gasPrice: addHexPrefix(
      decGWEIToHexWEI(
        gasEstimates.gasPrice || gasEstimates[DEFAULT_GAS_FEE_OPTION_LEGACY],
      ).toString(),
    ),
  };
}
