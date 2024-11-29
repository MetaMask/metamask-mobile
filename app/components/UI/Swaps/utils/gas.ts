import type {
  TransactionParams,
  FeeMarketGasFeeEstimates,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { addHexes, decGWEIToHexWEI } from '../../../../util/conversions';
import Engine from '../../../../core/Engine';

export async function getTransaction1559GasFeeEstimates(
  transactionParams: TransactionParams,
  estimatedBaseFeeGwei: string,
  chainId: Hex,
) {
  const estimatedBaseFee = decGWEIToHexWEI(estimatedBaseFeeGwei) as Hex;

  const { TransactionController } = Engine.context;

  const transactionGasFeeResponse = await TransactionController.estimateGasFee({
    transactionParams,
    chainId,
  });

  const transactionGasFeeEstimates = transactionGasFeeResponse?.estimates as
    | FeeMarketGasFeeEstimates
    | undefined;

  const { maxFeePerGas } = transactionGasFeeEstimates?.high ?? {};
  const { maxPriorityFeePerGas } = transactionGasFeeEstimates?.high ?? {};

  console.log("estimatedBaseFee", estimatedBaseFee)
  console.log("estimatedBaseFeeGwei", estimatedBaseFeeGwei)
  console.log("maxPriorityFeePerGas", maxPriorityFeePerGas)

  const baseAndPriorityFeePerGas = maxPriorityFeePerGas
    ? (addHexes(estimatedBaseFee, maxPriorityFeePerGas) as Hex)
    : undefined;

  return {
    baseAndPriorityFeePerGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}
