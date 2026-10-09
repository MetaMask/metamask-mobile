import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import { normalizeTokenAddress } from '../../Bridge/utils/tokenUtils';

/**
 * CAIP-19 id the price chart passes to `useOHLCVChart`.
 *
 * The chart formats `token.address`, not the route `caipAssetId`. Trending
 * supplies a lowercase CAIP id and a lowercase address, and
 * `formatAddressToAssetId` checksums EVM addresses, so those two strings
 * differ. Prefetch must use this id or the warmed query is a different key
 * than the one the chart reads.
 *
 * Polygon's native placeholder (`0x…1010`) is normalized to the zero address
 * first, matching the chart, so it becomes the chain's SLIP-44 id.
 */
export const resolveOhlcvChartAssetId = (
  address: string | undefined,
  chainId: string | undefined,
): string => {
  if (!address || !chainId) {
    return '';
  }

  const normalizedAddress = normalizeTokenAddress(address, chainId as Hex);

  try {
    return formatAddressToAssetId(normalizedAddress, chainId as Hex) ?? '';
  } catch {
    // formatAddressToAssetId throws for chains XChain Swaps does not support.
    return '';
  }
};
