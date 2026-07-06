import { isEIP1559Transaction } from '@metamask/transaction-controller';
import { sumHexWEIs } from '../../../util/conversions';
import {
  hexToBigInt,
  bigIntToHex,
  renderToGwei,
} from '../../../util/number/bigint';
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
    return hexToBigInt(eip1559GasHex.gasFeeMinHex ?? '0x0');
  }
  const gasValue = gas ? hexToBigInt(gas) : 0n;
  const gasPrice_ = gasPrice ? hexToBigInt(gasPrice) : 0n;
  const gasUsedValue = gasUsed ? hexToBigInt(gasUsed) : null;
  let totalGas = 0n;
  if (gasUsedValue !== null) {
    totalGas = gasUsedValue * gasPrice_;
  }
  totalGas = gasValue * gasPrice_;
  if (multiLayerL1FeeTotal) {
    totalGas = hexToBigInt(
      sumHexWEIs([bigIntToHex(totalGas), multiLayerL1FeeTotal]),
    );
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
      hexToBigInt(
        eip1559GasHex.estimatedBaseFee_PLUS_suggestedMaxPriorityFeePerGasHex,
      ),
    );
  }
  return renderToGwei(gasPrice ? hexToBigInt(gasPrice) : 0n);
}
