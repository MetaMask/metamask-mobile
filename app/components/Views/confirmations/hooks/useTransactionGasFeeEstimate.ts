import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { hexToBN } from '@metamask/controller-utils';

import { addHexes, decGWEIToHexWEI } from '../../../../util/conversions';
import { useGasFeeEstimates } from './useGasFeeEstimates';

const HEX_ZERO = '0x0';

function multiplyHexes(hex1: Hex, hex2: Hex) {
  return hexToBN(hex1 as Hex)
    .mul(hexToBN(hex2 as Hex))
    .toString(16);
}

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

  console.log('OGP- In useTransactionGasFeeEstimate - estimatedBaseFee', {
    estimatedBaseFee,
  });

  let gasEstimate: Hex;
  if (supportsEIP1559) {
    // Minimum Total Fee = (estimatedBaseFee + maxPriorityFeePerGas) * gasLimit
    let minimumFeePerGas = addHexes(
      estimatedBaseFee || HEX_ZERO,
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
