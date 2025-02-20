import { Hex } from '@metamask/utils';
import { hexToBN } from '@metamask/controller-utils';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { TransactionMeta } from '@metamask/transaction-controller';

import { addHexes, multiplyHexes } from '../../../../util/conversions';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import BigNumber from 'bignumber.js';

const HEX_ZERO = '0x0';

export function useTransactionGasFeeEstimate(
  transactionMeta: TransactionMeta,
  supportsEIP1559: boolean,
): Hex {
  let { gas: gasLimit, gasPrice } = transactionMeta.txParams;

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta.networkClientId,
  );
  const estimatedBaseFee = (gasFeeEstimates as GasFeeEstimates)
    ?.estimatedBaseFee;

  // override with values from `dappSuggestedGasFees` if they exist
  gasLimit = gasLimit || HEX_ZERO;
  gasPrice = gasPrice || HEX_ZERO;
  const maxPriorityFeePerGas =
    transactionMeta.txParams?.maxPriorityFeePerGas || HEX_ZERO;
  const maxFeePerGas = transactionMeta.txParams?.maxFeePerGas || HEX_ZERO;

  let gasEstimate: Hex;
  const hexEstimatedBaseFee = new BigNumber(estimatedBaseFee || 0)
    .times(1000000000)
    .toString(16);

  if (supportsEIP1559) {
    // Minimum Total Fee = (estimatedBaseFee + maxPriorityFeePerGas) * gasLimit
    let minimumFeePerGas = addHexes(
      hexEstimatedBaseFee || HEX_ZERO,
      maxPriorityFeePerGas,
    );

    const minimumFeePerGasBN = hexToBN(minimumFeePerGas as Hex);

    // `minimumFeePerGas` should never be higher than the `maxFeePerGas`
    if (minimumFeePerGasBN.gt(hexToBN(maxFeePerGas as Hex))) {
      minimumFeePerGas = maxFeePerGas;
    }

    gasEstimate = multiplyHexes(
      minimumFeePerGas as Hex,
      gasLimit as Hex,
    ) as Hex;
  } else {
    gasEstimate = multiplyHexes(gasPrice as Hex, gasLimit as Hex) as Hex;
  }

  return gasEstimate;
}
