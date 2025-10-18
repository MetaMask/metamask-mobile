import { isEIP1559Transaction } from '@metamask/transaction-controller';
import { sumHexWEIs } from '../../../util/conversions';
import {
  hexToBN,
  isBN,
  BNToHex,
  renderToGwei,
} from '../../../util/number/legacy';
import { calculateEIP1559GasFeeHexes } from '../../../util/transactions';

export function calculateTotalGas(transaction) {
  const {
    gas,
    gasPrice,
    gasUsed,
    estimatedBaseFee,
    maxPriorityFeePerGas,
    maxFeePerGas,
    multiLayerL1FeeTotal,
  } = transaction;
  if (isEIP1559Transaction(transaction)) {
    const eip1559GasHex = calculateEIP1559GasFeeHexes({
      gasLimitHex: gasUsed || gas,
      estimatedBaseFeeHex: estimatedBaseFee || '0x0',
      suggestedMaxPriorityFeePerGasHex: maxPriorityFeePerGas,
      suggestedMaxFeePerGasHex: maxFeePerGas,
    });
    return hexToBN(eip1559GasHex.gasFeeMinHex);
  }
  const gasBN = hexToBN(gas);
  const gasPriceBN = hexToBN(gasPrice);
  const gasUsedBN = gasUsed ? hexToBN(gasUsed) : null;
  let totalGas = hexToBN('0x0');
  if (gasUsedBN && isBN(gasUsedBN) && isBN(gasPriceBN)) {
    totalGas = gasUsedBN.mul(gasPriceBN);
  }
  if (isBN(gasBN) && isBN(gasPriceBN)) {
    totalGas = gasBN.mul(gasPriceBN);
  }
  if (multiLayerL1FeeTotal) {
    totalGas = hexToBN(sumHexWEIs([BNToHex(totalGas), multiLayerL1FeeTotal]));
  }
  return totalGas;
}
export function renderGwei(transaction) {
  const {
    gasPrice,
    estimatedBaseFee,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gas,
  } = transaction;

  if (isEIP1559Transaction(transaction)) {
    const eip1559GasHex = calculateEIP1559GasFeeHexes({
      gasLimitHex: gas,
      estimatedBaseFeeHex: estimatedBaseFee || '0x0',
      suggestedMaxPriorityFeePerGasHex: maxPriorityFeePerGas,
      suggestedMaxFeePerGasHex: maxFeePerGas,
    });

    return renderToGwei(
      eip1559GasHex.estimatedBaseFee_PLUS_suggestedMaxPriorityFeePerGasHex,
    );
  }
  return renderToGwei(gasPrice);
}
