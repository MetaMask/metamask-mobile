import BN from 'bnjs4';
import { hexToBN } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';

export interface GasFeeEstimatesType {
  medium: {
    suggestedMaxFeePerGas: number;
  };
}

export const NATIVE_TRANSFER_GAS_LIMIT = 21000;
const GWEI_TO_WEI_CONVERSION_RATE = 1e9;

/**
 * Estimates the total gas (in wei) a native-asset transfer needs, used to
 * reserve a portion of the native balance when computing "max" amounts —
 * shared by the Send flow's percentage/Max buttons (`usePercentageAmount`)
 * and the QuickBuy slider max (`getSpendableSourceBalance`).
 */
export const getEstimatedTotalGas = (
  gasFeeEstimates: GasFeeEstimatesType,
  layer1GasFee: Hex,
) => {
  if (!gasFeeEstimates) {
    return new BN(0);
  }
  const suggestedMaxFeePerGas =
    gasFeeEstimates?.medium?.suggestedMaxFeePerGas ?? '0';
  const totalGas = new BN(suggestedMaxFeePerGas * NATIVE_TRANSFER_GAS_LIMIT);
  const conversionrate = new BN(GWEI_TO_WEI_CONVERSION_RATE);
  return totalGas
    .mul(conversionrate)
    .add(new BN(hexToBN(layer1GasFee).toString()));
};
