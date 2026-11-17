import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { getAssetPreferences } from '../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getCaipChainIdFromAssetId } from '../../../UI/Trending/components/TrendingTokenRowItem/utils';

/** Ids of all hidden assets. Per-asset version: `useAssetVisibility`. */
export const useHiddenAssetIds = (): string[] => {
  const assetPreferences = useSelector(getAssetPreferences);
  const allIgnoredAssets = useSelector(selectMultichainAssetsAllIgnoredAssets);
  const internalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  return useMemo(() => {
    const ids = new Set<string>(
      Object.entries(assetPreferences)
        .filter(([, preference]) => preference?.hidden === true)
        .map(([assetId]) => assetId),
    );
    // Non-EVM ignored assets count only for the account that owns the chain.
    Object.entries(allIgnoredAssets).forEach(([accountId, assetIds]) =>
      assetIds.forEach((assetId) => {
        const chain = getCaipChainIdFromAssetId(assetId);
        if (
          internalAccountByScope(chain as SupportedCaipChainId)?.id ===
          accountId
        ) {
          ids.add(assetId);
        }
      }),
    );
    return [...ids];
  }, [assetPreferences, allIgnoredAssets, internalAccountByScope]);
};
