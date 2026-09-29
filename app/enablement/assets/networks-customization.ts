import {
  AccountGroupAssets,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { Hex, isStrictHexString } from '@metamask/utils';
import { ImportAsset } from '../../components/Views/AddAsset/utils/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

/**
 * The Arc USDC ERC-20 token contract. On Arc, USDC is the native gas token
 * and is also exposed through this ERC-20 interface; both share the same
 * underlying balance. It is hidden across the UI (token list, aggregated
 * balance, send asset picker) in favour of the native representation to
 * avoid double-counting.
 */
export const ARC_USDC_ERC20_TOKEN_ADDRESS =
  '0x3600000000000000000000000000000000000000';

/**
 * The Stable USDT0 ERC-20 token contract. Since Stable v1.2.0, USDT0
 * (replacing gUSDT) is the native gas token and is also exposed as this
 * ERC-20. It is hidden across the UI (token list, aggregated balance, send
 * asset picker) in favour of the native representation to avoid
 * double-counting.
 */
export const STABLE_USDT0_ERC20_ADDRESS =
  '0x779ded0c9e1022225f8e0630b35a9b54be713736';

// For token visibility in the Asset List + Send picker.
// Keys and values are normalized to lowercase at module load so all lookups
// and comparisons are case-insensitive.
const EXCLUDED_ASSETS_FROM_ASSET_LIST: Record<string, string> =
  Object.fromEntries(
    Object.entries({
      [NETWORKS_CHAIN_ID.ARC]: ARC_USDC_ERC20_TOKEN_ADDRESS,
      [NETWORKS_CHAIN_ID.STABLE]: STABLE_USDT0_ERC20_ADDRESS,
    }).map(([chainId, address]) => [
      chainId.toLowerCase(),
      address.toLowerCase(),
    ]),
  );

/**
 * Returns the excluded ERC-20 address (lowercase) for a chain, or undefined
 * if the chain has none. Case-insensitive on the chain ID.
 */
function getExcludedAddress(chainId: string): string | undefined {
  return EXCLUDED_ASSETS_FROM_ASSET_LIST[chainId.toLowerCase()];
}

/**
 * Whether the given address is the excluded ERC-20 for the given chain.
 * Case-insensitive on both chain ID and address.
 */
function isExcludedAsset(chainId: string, address: string): boolean {
  return getExcludedAddress(chainId) === address.toLowerCase();
}

/**
 * Removes chain-specific ERC-20 tokens (e.g. Arc USDC at 0x3600...,
 * Stable USDT0) from the per-chain asset map so they never appear as
 * duplicates of the native token. The native token (zero address) is kept -
 * it is the source of truth for display on those chains.
 */
export function filterExcludedAssets(
  assets: AccountGroupAssets,
): AccountGroupAssets {
  return Object.entries(assets).reduce((acc, [chainId, chainAssets]) => {
    if (!chainAssets || !getExcludedAddress(chainId)) {
      return acc;
    }
    return {
      ...acc,
      [chainId]: chainAssets.filter(
        (asset) =>
          !('address' in asset) || !isExcludedAsset(chainId, asset.address),
      ),
    };
  }, assets);
}

/**
 * Strips excluded ERC-20s (e.g. Arc USDC at 0x3600..., Stable USDT0)
 * from the nested account > chain > address balance map - the native token
 * already reflects those balances, so counting both would double the
 * aggregated balance.
 */
export function filterExcludedTokenBalances(
  tokenBalances: TokenBalancesControllerState['tokenBalances'],
): TokenBalancesControllerState['tokenBalances'] {
  return Object.fromEntries(
    Object.entries(tokenBalances).map(([account, chainMap]) => [
      account,
      Object.fromEntries(
        Object.entries(chainMap).map(([chainId, addressMap]) => {
          if (!getExcludedAddress(chainId)) {
            return [chainId, addressMap];
          }
          return [
            chainId,
            Object.fromEntries(
              Object.entries(addressMap).filter(
                ([address]) => !isExcludedAsset(chainId, address),
              ),
            ),
          ];
        }),
      ),
    ]),
  );
}

/**
 * Filters out excluded ERC-20s (e.g. Arc USDC at 0x3600...) for the
 * given chain - they are display duplicates of the chain's native gas token.
 */
export function filterExcludedImportAssets(
  tokens: ImportAsset[],
  chainId: SupportedCaipChainId | Hex | undefined,
): ImportAsset[] {
  if (!chainId || !isStrictHexString(chainId)) {
    return tokens;
  }
  if (!getExcludedAddress(chainId)) {
    return tokens;
  }
  return tokens.filter((t) => !isExcludedAsset(chainId, t.address));
}
