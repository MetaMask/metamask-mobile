import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type FeeMarketGasFeeEstimates,
  type GasFeeEstimates,
  type GasPriceGasFeeEstimates,
  type LegacyGasFeeEstimates,
} from '@metamask/transaction-controller';
import { decGWEIToHexWEI } from '../conversions';
import { addHexPrefix } from '../number';

/**
 * Returns the hex gas price (in wei) for the "medium" tier from gas fee estimates.
 * Used when a legacy tx has existing gasPrice 0x0 so cancel/speed-up can fall back to a mineable price.
 */
export function getMediumGasPriceHex(
  gasFeeEstimates:
    | GasFeeEstimates
    | { medium?: unknown; gasPrice?: string }
    | null
    | undefined,
): string {
  if (!gasFeeEstimates) {
    return addHexPrefix(String(decGWEIToHexWEI('0')));
  }

  if ('type' in (gasFeeEstimates as object)) {
    const typedEstimates = gasFeeEstimates as GasFeeEstimates;
    let estimateGweiDecimalRaw: string;

    switch (typedEstimates.type) {
      case GasFeeEstimateType.FeeMarket: {
        const level = (typedEstimates as FeeMarketGasFeeEstimates)[
          GasFeeEstimateLevel.Medium
        ];
        estimateGweiDecimalRaw = (
          level as unknown as { suggestedMaxFeePerGas: string }
        ).suggestedMaxFeePerGas;
        break;
      }
      case GasFeeEstimateType.Legacy: {
        estimateGweiDecimalRaw = (typedEstimates as LegacyGasFeeEstimates)[
          GasFeeEstimateLevel.Medium
        ] as unknown as string;
        break;
      }
      case GasFeeEstimateType.GasPrice: {
        estimateGweiDecimalRaw = (typedEstimates as GasPriceGasFeeEstimates)
          .gasPrice as string;
        break;
      }
      default: {
        estimateGweiDecimalRaw = '0';
      }
    }

    return addHexPrefix(
      String(decGWEIToHexWEI(String(estimateGweiDecimalRaw))),
    );
  }

  const maybeFeeMarket = (
    gasFeeEstimates as {
      medium?: { suggestedMaxFeePerGas?: string } | string;
    }
  ).medium;

  if (
    maybeFeeMarket &&
    typeof maybeFeeMarket === 'object' &&
    'suggestedMaxFeePerGas' in maybeFeeMarket
  ) {
    return addHexPrefix(
      String(
        decGWEIToHexWEI(
          String(
            (maybeFeeMarket as { suggestedMaxFeePerGas?: string })
              .suggestedMaxFeePerGas ?? '0',
          ),
        ),
      ),
    );
  }

  if (
    maybeFeeMarket &&
    typeof maybeFeeMarket === 'string' &&
    maybeFeeMarket.length > 0
  ) {
    return addHexPrefix(String(decGWEIToHexWEI(maybeFeeMarket)));
  }

  const maybeGasPrice = (gasFeeEstimates as { gasPrice?: string }).gasPrice;
  if (maybeGasPrice) {
    return addHexPrefix(String(decGWEIToHexWEI(String(maybeGasPrice))));
  }

  return addHexPrefix(String(decGWEIToHexWEI('0')));
}
