/**
 * Perps configuration constants - Mobile UI layer
 *
 * Portable exports live in controllers/constants/perpsConfig.ts
 * and are re-exported here for backward compatibility.
 *
 * Mobile-only exports (TokenI, @metamask/swaps-controller dependencies) live only in this file.
 */
import type { Hex } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';

// Re-export all portable constants for backward compatibility
export * from '@metamask/perps-controller/constants/perpsConfig';

/** Address used to represent "Perps balance" as the payment token (synthetic option). */
export const PERPS_BALANCE_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Hex;

/** Chain id used for the "Perps balance" payment option. */
export { ARBITRUM_CHAIN_ID as PERPS_BALANCE_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

/**
 * Minimum number of aggregators (exchanges) a token must be listed on
 * to be considered trustworthy for showing the Perps Discovery Banner.
 * Native tokens (ETH, BNB, etc.) bypass this check.
 */
export const PERPS_MIN_AGGREGATORS_FOR_TRUST = 2;

/**
 * Checks if an asset is trustworthy for displaying the Perps Discovery Banner.
 * An asset is considered trustworthy if:
 * - It is a native asset (ETH, BNB, SOL, etc.), OR
 * - It is listed on at least PERPS_MIN_AGGREGATORS_FOR_TRUST exchanges
 *
 * @param asset - Asset object (TokenI or partial TokenI)
 * @returns true if the asset is trustworthy, false otherwise
 */
export const isTokenTrustworthyForPerps = (asset: Partial<TokenI>): boolean => {
  const isNativeAsset = asset.isNative || asset.isETH;
  const hasEnoughAggregators =
    (asset.aggregators?.length ?? 0) >= PERPS_MIN_AGGREGATORS_FOR_TRUST;
  return isNativeAsset || hasEnoughAggregators;
};
