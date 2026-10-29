import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import type { FlashListAssetKey } from '../TokenList/TokenList';

/**
 * Filters token keys by symbol or name (case-insensitive). The keys only carry
 * address/chainId, so symbol/name come from the account group assets.
 * An empty query returns the original array.
 */
export const useTokenSearch = (
  tokenKeys: FlashListAssetKey[],
  searchQuery: string,
): FlashListAssetKey[] => {
  const assetsByChain = useSelector(selectAssetsBySelectedAccountGroup);

  const searchTextByKey = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const chainAssets of Object.values(assetsByChain)) {
      for (const { chainId, assetId, symbol, name } of chainAssets) {
        lookup.set(`${chainId}:${assetId}`, `${symbol} ${name}`.toLowerCase());
      }
    }
    return lookup;
  }, [assetsByChain]);

  const query = searchQuery.trim().toLowerCase();

  return useMemo(
    () =>
      query
        ? tokenKeys.filter(({ chainId, address }) =>
            searchTextByKey.get(`${chainId}:${address}`)?.includes(query),
          )
        : tokenKeys,
    [tokenKeys, searchTextByKey, query],
  );
};
