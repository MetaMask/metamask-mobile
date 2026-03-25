import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type FeeMarketGasFeeEstimates,
  type GasFeeEstimates,
  type GasPriceGasFeeEstimates,
  type LegacyGasFeeEstimates,
  type TransactionParams,
} from '@metamask/transaction-controller';
import { weiHexToGweiDec } from '@metamask/controller-utils';
import BigNumber from 'bignumber.js';
import { decGWEIToHexWEI } from '../conversions';
import { addHexPrefix } from '../number';

export type GasFeeEstimatesInput =
  | GasFeeEstimates
  | { medium?: unknown; gasPrice?: string }
  | null
  | undefined;

/**
 * Returns the hex gas price (in wei) for the "medium" tier from gas fee estimates.
 * Used when a legacy tx has existing gasPrice 0x0 so cancel/speed-up can fall back to a mineable price.
 */
export function getMediumGasPriceHex(
  gasFeeEstimates: GasFeeEstimatesInput,
): string {
  const gweiEstimate = getMediumEstimateGwei(gasFeeEstimates);
  const gwei = gweiEstimate && gweiEstimate.length > 0 ? gweiEstimate : '0';
  return addHexPrefix(String(decGWEIToHexWEI(gwei)));
}

/**
 * Multiplies a hex wei value by 1.1 (10% increase) and rounds to integer wei.
 *
 * @param hexStringValue - Hex string in wei
 * @returns 0x-prefixed hex string 10% higher, or undefined when input is falsy.
 */
export function addTenPercentAndRound(
  hexStringValue: string | undefined,
): string | undefined {
  if (!hexStringValue) {
    return undefined;
  }
  const value = new BigNumber(hexStringValue, 16);
  return addHexPrefix(
    value.times(1.1).integerValue(BigNumber.ROUND_FLOOR).toString(16),
  );
}

/**
 * Extracts the medium-level gas fee estimate as a decimal GWEI string.
 * Handles typed estimates (FeeMarket, Legacy, GasPrice) and untyped legacy shapes.
 */
export function getMediumEstimateGwei(
  gasFeeEstimates: GasFeeEstimatesInput,
): string | undefined {
  if (!gasFeeEstimates) return undefined;

  if ('type' in (gasFeeEstimates as object)) {
    const typedEstimates = gasFeeEstimates as GasFeeEstimates;
    switch (typedEstimates.type) {
      case GasFeeEstimateType.FeeMarket: {
        const level = (typedEstimates as FeeMarketGasFeeEstimates)[
          GasFeeEstimateLevel.Medium
        ];
        return (level as unknown as { suggestedMaxFeePerGas: string })
          .suggestedMaxFeePerGas;
      }
      case GasFeeEstimateType.Legacy:
        return (typedEstimates as LegacyGasFeeEstimates)[
          GasFeeEstimateLevel.Medium
        ] as unknown as string;
      case GasFeeEstimateType.GasPrice:
        return (typedEstimates as GasPriceGasFeeEstimates).gasPrice as string;
      default:
        return undefined;
    }
  }

  const mediumLevel = (
    gasFeeEstimates as { medium?: { suggestedMaxFeePerGas?: string } | string }
  ).medium;
  if (
    mediumLevel &&
    typeof mediumLevel === 'object' &&
    'suggestedMaxFeePerGas' in mediumLevel
  ) {
    return mediumLevel.suggestedMaxFeePerGas;
  }
  if (mediumLevel && typeof mediumLevel === 'string') {
    return mediumLevel;
  }

  const maybeGasPrice = (gasFeeEstimates as { gasPrice?: string }).gasPrice;
  return maybeGasPrice ?? undefined;
}

/**
 * Returns true when the medium network estimate is strictly greater than the
 * transaction's current gas fee plus 10%.
 *
 * @param txParams - Transaction params containing maxFeePerGas (EIP-1559) or gasPrice (legacy).
 * @param gasFeeEstimates - Gas fee estimates from GasFeeController / Redux.
 * @returns true if market medium estimate exceeds the bumped (×1.1) transaction gas fee.
 */
export function gasEstimateGreaterThanGasUsedPlusTenPercent(
  txParams: TransactionParams,
  gasFeeEstimates: GasFeeEstimatesInput,
): boolean {
  const gasInTransaction =
    (txParams?.maxFeePerGas as string | undefined) ??
    (txParams?.gasPrice as string | undefined);
  const bumped = addTenPercentAndRound(gasInTransaction);
  if (!bumped) {
    return false;
  }
  const bumpedGwei = new BigNumber(String(weiHexToGweiDec(bumped)));

  const estimateGwei = getMediumEstimateGwei(gasFeeEstimates);
  if (!estimateGwei) {
    return false;
  }

  return new BigNumber(String(estimateGwei)).gt(bumpedGwei);
}
