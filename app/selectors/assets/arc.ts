import type {
  AccountGroupAssets,
  AssetsByAccountGroup,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { NETWORKS_CHAIN_ID } from '../../constants/network';

/**
 * Arc treats USDC as its display currency. Its native token lives at the zero
 * address and is effectively a duplicate of the USDC ERC20 that users actually
 * interact with. We therefore hide the Arc native token from the wallet token
 * list and exclude it from the aggregated balance.
 *
 * This filtering is intentionally scoped to the token-list and aggregated-balance
 * selectors only — other consumers (e.g. network fee / gas estimation) still
 * need the real native token, so it must NOT be stripped at the base
 * (assets-migration) selector layer.
 */
export const ARC_CHAIN_ID = NETWORKS_CHAIN_ID.ARC as Hex;

export const ARC_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Hex;

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

/**
 * Removes the Arc native token from a per-account-group asset map (ChainId ->
 * Asset[]) so it does not appear in the wallet token list. Returns the original
 * reference when there is nothing to strip, preserving memoization.
 */
export function omitArcNativeFromAccountGroupAssets(
  assets: AccountGroupAssets,
): AccountGroupAssets {
  const arcAssets = assets[ARC_CHAIN_ID];
  if (!arcAssets) {
    return assets;
  }

  const filtered = arcAssets.filter((asset) => !asset.isNative);
  if (filtered.length === arcAssets.length) {
    return assets;
  }

  return { ...assets, [ARC_CHAIN_ID]: filtered };
}

/**
 * Removes the Arc native token from a grouped asset map keyed by account group
 * (AccountGroupId -> ChainId -> Asset[]). Returns the original reference when
 * there is nothing to strip, preserving memoization.
 */
export function omitArcNativeFromAllAssets(
  grouped: AssetsByAccountGroup,
): AssetsByAccountGroup {
  let mutated = false;
  const result: AssetsByAccountGroup = {};

  for (const [groupId, groupAssets] of Object.entries(grouped) as [
    keyof AssetsByAccountGroup,
    AccountGroupAssets,
  ][]) {
    const filtered = omitArcNativeFromAccountGroupAssets(groupAssets);
    if (filtered !== groupAssets) {
      mutated = true;
    }
    result[groupId] = filtered;
  }

  return mutated ? result : grouped;
}
