import type {
  TransactionParams,
  FeeMarketGasFeeEstimates,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { addHexes, decGWEIToHexWEI } from '../../../../util/conversions';
import { estimateGasFee } from '../../../../util/transaction-controller';

export async function getTransaction1559GasFeeEstimates(
  transactionParams: TransactionParams,
  estimatedBaseFeeGwei: string,
  chainId: Hex,
) {
  const estimatedBaseFee = decGWEIToHexWEI(estimatedBaseFeeGwei) as Hex;

  const transactionGasFeeResponse = await estimateGasFee({
    transactionParams,
    chainId,
  });

  const transactionGasFeeEstimates = transactionGasFeeResponse?.estimates as
    | FeeMarketGasFeeEstimates
    | undefined;

  const { maxFeePerGas } = transactionGasFeeEstimates?.high ?? {};
  const { maxPriorityFeePerGas } = transactionGasFeeEstimates?.high ?? {};

  const baseAndPriorityFeePerGas = maxPriorityFeePerGas
    ? (addHexes(estimatedBaseFee, maxPriorityFeePerGas) as Hex)
    : undefined;

  return {
    baseAndPriorityFeePerGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}
