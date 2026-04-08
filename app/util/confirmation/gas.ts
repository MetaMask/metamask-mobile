import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type FeeMarketEIP1559Values,
  type FeeMarketGasFeeEstimates,
  type GasFeeEstimates,
  type GasPriceGasFeeEstimates,
  type GasPriceValue,
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

interface FeeMarketMediumLevel {
  suggestedMaxFeePerGas?: string;
  suggestedMaxPriorityFeePerGas?: string;
}

interface ResolvedMediumEstimate {
  feeMarketLevel?: FeeMarketMediumLevel;
  scalarGwei?: string;
}

/**
 * Extracts the medium-level gas fee estimate from various possible shapes of gas fee estimates.
 */
function resolveMediumEstimate(
  gasFeeEstimates: GasFeeEstimatesInput,
): ResolvedMediumEstimate {
  if (!gasFeeEstimates) {
    return {};
  }

  if ('type' in (gasFeeEstimates as object)) {
    const typedEstimates = gasFeeEstimates as GasFeeEstimates;
    switch (typedEstimates.type) {
      case GasFeeEstimateType.FeeMarket: {
        const level = (typedEstimates as FeeMarketGasFeeEstimates)[
          GasFeeEstimateLevel.Medium
        ];
        return {
          feeMarketLevel: level as unknown as FeeMarketMediumLevel,
        };
      }
      case GasFeeEstimateType.Legacy:
        return {
          scalarGwei: (typedEstimates as LegacyGasFeeEstimates)[
            GasFeeEstimateLevel.Medium
          ] as unknown as string,
        };
      case GasFeeEstimateType.GasPrice:
        return {
          scalarGwei: (typedEstimates as GasPriceGasFeeEstimates)
            .gasPrice as string,
        };
      default:
        return {};
    }
  }

  const mediumLevel = (
    gasFeeEstimates as { medium?: FeeMarketMediumLevel | string }
  ).medium;

  if (
    mediumLevel &&
    typeof mediumLevel === 'object' &&
    ('suggestedMaxFeePerGas' in mediumLevel ||
      'suggestedMaxPriorityFeePerGas' in mediumLevel)
  ) {
    return { feeMarketLevel: mediumLevel };
  }
  if (mediumLevel && typeof mediumLevel === 'string') {
    return { scalarGwei: mediumLevel };
  }

  const maybeGasPrice = (gasFeeEstimates as { gasPrice?: string }).gasPrice;
  if (maybeGasPrice) {
    return { scalarGwei: maybeGasPrice };
  }

  return {};
}

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
  const { feeMarketLevel, scalarGwei } = resolveMediumEstimate(gasFeeEstimates);
  return feeMarketLevel?.suggestedMaxFeePerGas ?? scalarGwei;
}

/**
 * Extracts the medium tier's `suggestedMaxPriorityFeePerGas` as a decimal GWEI string
 * when present (EIP-1559 fee-market shapes only). Legacy string `medium`, GasPrice type,
 * and `gasPrice` fallback do not carry priority and yield `undefined`.
 */
export function getMediumPriorityFeeGwei(
  gasFeeEstimates: GasFeeEstimatesInput,
): string | undefined {
  const { feeMarketLevel } = resolveMediumEstimate(gasFeeEstimates);
  return feeMarketLevel?.suggestedMaxPriorityFeePerGas;
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
  const gasInTransaction = txParams?.maxFeePerGas ?? txParams?.gasPrice;
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

export interface PreviousGasParams {
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
  gasLimit?: string;
  gas?: string;
}

/**
 * Ensures gas values for a replacement (cancel/speed-up) transaction are not
 * underpriced. For each gas field the result is the higher of the user-selected
 * value or `previousGas × rate`.
 *
 * @param gasValues - Current gas values the user selected (from the gas modal).
 * @param previousGas - Original gas values captured when the cancel/speed-up modal opened.
 * @param rate - Multiplier for minimum replacement gas.
 * @returns Gas values safe for replacement, or the input unchanged when previousGas is absent.
 */
export function getGasValuesForReplacement(
  gasValues: GasPriceValue | FeeMarketEIP1559Values | undefined,
  previousGas: PreviousGasParams | undefined | null,
  rate: number,
): GasPriceValue | FeeMarketEIP1559Values | undefined {
  if (!previousGas || !gasValues) {
    return gasValues;
  }

  const hexBN = (v: string | undefined | null): BigNumber =>
    v ? new BigNumber(addHexPrefix(String(v)), 16) : new BigNumber(0);

  // Legacy (gasPrice) flow
  if ('gasPrice' in gasValues) {
    if (!previousGas.gasPrice) {
      return gasValues;
    }
    const minGasPrice = hexBN(previousGas.gasPrice)
      .times(rate)
      .integerValue(BigNumber.ROUND_CEIL);
    const minGasPriceHex = addHexPrefix(minGasPrice.toString(16));

    const gasPrice = hexBN(gasValues.gasPrice).gte(minGasPrice)
      ? gasValues.gasPrice
      : minGasPriceHex;

    return { gasPrice };
  }

  // EIP-1559 flow
  if (!previousGas.maxFeePerGas || !previousGas.maxPriorityFeePerGas) {
    return gasValues;
  }

  const minMaxFee = hexBN(previousGas.maxFeePerGas)
    .times(rate)
    .integerValue(BigNumber.ROUND_CEIL);
  const minPriorityFee = hexBN(previousGas.maxPriorityFeePerGas)
    .times(rate)
    .integerValue(BigNumber.ROUND_CEIL);

  const minMaxFeeHex = addHexPrefix(minMaxFee.toString(16));
  const minPriorityFeeHex = addHexPrefix(minPriorityFee.toString(16));

  const maxFeePerGas = hexBN(
    (gasValues as FeeMarketEIP1559Values).maxFeePerGas,
  ).gte(minMaxFee)
    ? (gasValues as FeeMarketEIP1559Values).maxFeePerGas
    : minMaxFeeHex;

  const maxPriorityFeePerGas = hexBN(
    (gasValues as FeeMarketEIP1559Values).maxPriorityFeePerGas,
  ).gte(minPriorityFee)
    ? (gasValues as FeeMarketEIP1559Values).maxPriorityFeePerGas
    : minPriorityFeeHex;

  return { maxFeePerGas, maxPriorityFeePerGas };
}
