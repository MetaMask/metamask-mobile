import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectAssetsBySelectedAccountGroup,
  selectStakedAssets,
} from '../../../../selectors/assets/assets-list';
import type { FlashListAssetKey } from '../TokenList/TokenList';

const getLookupKey = (
  chainId: string | undefined,
  assetId: string,
  isStaked: boolean,
) => `${chainId}:${assetId}:${isStaked}`;

/**
 * Filters token keys by symbol or name (case-insensitive). The keys only carry
 * address/chainId, so symbol/name come from the account group assets. Staked
 * rows share their native asset's id, so they are looked up separately to match
 * on their own name (e.g. "Staked Ethereum").
 * An empty query returns the original array.
 */
export const useTokenSearch = (
  tokenKeys: FlashListAssetKey[],
  searchQuery: string,
): FlashListAssetKey[] => {
  const assetsByChain = useSelector(selectAssetsBySelectedAccountGroup);

  const stakedAssets = useSelector(selectStakedAssets);

  const searchTextByKey = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const chainAssets of Object.values(assetsByChain)) {
      for (const { chainId, assetId, symbol, name } of chainAssets) {
        lookup.set(
          getLookupKey(chainId, assetId, false),
          `${symbol} ${name}`.toLowerCase(),
        );
      }
    }
    for (const { stakedAsset } of stakedAssets) {
      const { chainId, assetId, symbol, name } = stakedAsset;
      lookup.set(
        getLookupKey(String(chainId), assetId, true),
        `${symbol} ${name}`.toLowerCase(),
      );
    }
    return lookup;
  }, [assetsByChain, stakedAssets]);

  const query = searchQuery.trim().toLowerCase();

  return useMemo(
    () =>
      query
        ? tokenKeys.filter(({ chainId, address, isStaked }) =>
            searchTextByKey
              .get(getLookupKey(chainId, address, Boolean(isStaked)))
              ?.includes(query),
          )
        : tokenKeys,
    [tokenKeys, searchTextByKey, query],
  );
};
