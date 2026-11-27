import type { CaipAssetType } from '@metamask/utils';

import { LIGHTER_USDC_ASSET_ID } from '../temp-lighter/perps-lighter-transactions';
import type { PerpsProviderSelection } from './perps-lighter-transaction-type';

/**
 * CAIP-19 id of the Hyperliquid USDC perps balance. Pay accepts it as the
 * receiving balance of a Perps withdraw, next to `LIGHTER_USDC_ASSET_ID`.
 */
export const HYPERLIQUID_USDC_ASSET_ID = 'hyperliq:mainnet/perps:usdc' as const;

const PERPS_BALANCE_ASSET_IDS: Record<PerpsProviderSelection, CaipAssetType> = {
  hyperliquid: HYPERLIQUID_USDC_ASSET_ID,
  lighter: LIGHTER_USDC_ASSET_ID,
};

export function getPerpsBalanceAssetId(
  provider: PerpsProviderSelection,
): CaipAssetType {
  return PERPS_BALANCE_ASSET_IDS[provider];
}

/**
 * @param assetId - Asset id of a payment token.
 * @returns The Perps provider whose balance the asset is, or undefined when it
 * is not a Perps balance.
 */
export function getPerpsBalanceProvider(
  assetId: string | undefined,
): PerpsProviderSelection | undefined {
  if (assetId === HYPERLIQUID_USDC_ASSET_ID) {
    return 'hyperliquid';
  }

  if (assetId === LIGHTER_USDC_ASSET_ID) {
    return 'lighter';
  }

  return undefined;
}
