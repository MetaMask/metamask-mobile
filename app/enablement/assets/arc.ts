import type { TokenBalancesControllerState } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { NETWORKS_CHAIN_ID } from '../../constants/network';

/**
 * Arc augmentations hub.
 *
 * This module is the single place that documents and implements the special
 * casing the app needs for the Arc network. Keeping it together makes it easy
 * to understand *why* these adjustments exist and to reason about them as a
 * group in the future.
 *
 * Arc treats USDC as its display currency. Its native token lives at the zero
 * address and is effectively a duplicate of the USDC ERC20 that users actually
 * interact with. We therefore hide the Arc native token from the wallet token
 * list and exclude it from the aggregated balance.
 *
 * This filtering is intentionally scoped to the wallet token-list and
 * aggregated-balance selectors only. Other consumers — network fee / gas
 * estimation, and the confirmation/send "pay with" flow (`useAccountTokens`) —
 * still need the real native token, so it must NOT be stripped at the base
 * (`assets-migration` / `selectAssetsBySelectedAccountGroup`) selector layer.
 */
export const ARC_CHAIN_ID = NETWORKS_CHAIN_ID.ARC as Hex;

export const ARC_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Hex;

/**
 * Whether an asset is the Arc native token (the zero-address duplicate of the
 * USDC ERC20). Used to hide it from the wallet token list.
 */
export function isArcNativeAsset(asset: {
  chainId?: string;
  isNative?: boolean;
}): boolean {
  return (
    Boolean(asset.isNative) && asset.chainId?.toLowerCase() === ARC_CHAIN_ID
  );
}

/**
 * Removes every Arc native token from a list of assets. Generic over the asset
 * shape so it can be reused by any consumer holding a token-like array (send
 * picker, lists, etc.).
 */
export function filterOutArcNativeAsset<
  T extends { chainId?: string; isNative?: boolean },
>(assets: T[]): T[] {
  return assets.filter((asset) => !isArcNativeAsset(asset));
}

/**
 * Whether Arc-specific UI should be hidden for the given chain. On Arc the
 * transaction always pays with the native token (USDC), so flows like the
 * confirmation "pay with" row have no alternative route to offer.
 */
export function shouldHideArc(chainId?: string): boolean {
  return chainId?.toLowerCase() === ARC_CHAIN_ID;
}

/**
 * Removes the Arc native (zero address) balance from a token-balances map so it
 * is excluded from the aggregated balance. Returns the original reference when
 * there is nothing to strip, preserving memoization.
 *
 * Shape: AccountAddress -> ChainId (hex) -> TokenAddress -> Balance (hex).
 */
export function omitArcNativeTokenBalances(
  tokenBalances: TokenBalancesControllerState['tokenBalances'],
): TokenBalancesControllerState['tokenBalances'] {
  let mutated = false;
  const result: TokenBalancesControllerState['tokenBalances'] = {};

  for (const [account, chainMap] of Object.entries(tokenBalances) as [
    keyof TokenBalancesControllerState['tokenBalances'],
    TokenBalancesControllerState['tokenBalances'][Hex],
  ][]) {
    const arcChain = chainMap[ARC_CHAIN_ID];

    if (arcChain && ARC_NATIVE_TOKEN_ADDRESS in arcChain) {
      const filteredArcChain = { ...arcChain };
      delete filteredArcChain[ARC_NATIVE_TOKEN_ADDRESS];
      result[account] = { ...chainMap, [ARC_CHAIN_ID]: filteredArcChain };
      mutated = true;
    } else {
      result[account] = chainMap;
    }
  }

  return mutated ? result : tokenBalances;
}
