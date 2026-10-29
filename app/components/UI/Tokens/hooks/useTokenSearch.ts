import { useMemo } from 'react';
import type { Asset } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import {
  selectAssetsBySelectedAccountGroup,
  selectStakedAssets,
} from '../../../../selectors/assets/assets-list';
import type { FlashListAssetKey } from '../TokenList/TokenList';

const lookupKey = (
  chainId: string | undefined,
  assetId: string,
  isStaked: boolean,
) => `${chainId}:${assetId}:${isStaked}`;

// Fields are joined with a newline, which a user cannot type, so a query never
// matches across the symbol/name boundary. Missing names are skipped.
const toEntry = (
  { chainId, assetId, symbol, name }: Asset,
  isStaked: boolean,
): [string, string] => [
  lookupKey(chainId, assetId, isStaked),
  [symbol, name].filter(Boolean).join('\n').toLowerCase(),
];

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

  const searchTextByKey = useMemo(
    () =>
      new Map([
        ...Object.values(assetsByChain)
          .flat()
          .map((asset) => toEntry(asset, false)),
        ...stakedAssets.map(({ stakedAsset }) => toEntry(stakedAsset, true)),
      ]),
    [assetsByChain, stakedAssets],
  );

  const query = searchQuery.trim().toLowerCase();

  return useMemo(
    () =>
      query
        ? tokenKeys.filter(({ chainId, address, isStaked }) =>
            searchTextByKey
              .get(lookupKey(chainId, address, Boolean(isStaked)))
              ?.includes(query),
          )
        : tokenKeys,
    [tokenKeys, searchTextByKey, query],
  );
};
