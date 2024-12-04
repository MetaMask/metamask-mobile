import type {
  TransactionParams,
  FeeMarketGasFeeEstimates,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { estimateGasFee } from '../../../../util/transaction-controller';

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
