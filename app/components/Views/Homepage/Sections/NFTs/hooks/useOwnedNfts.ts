import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Nft } from '@metamask/assets-controllers';
import { RootState } from '../../../../../../reducers';
import { multichainCollectiblesByEnabledNetworksSelector } from '../../../../../../reducers/collectibles';
import { useNetworkEnablement } from '../../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../../selectors/multichainAccounts/accountTreeController';

/**
 * Hook to get all owned NFTs for the currently selected account
 * across popular networks (listPopularNetworks), with fallback to enabled networks.
 * Aggregates from all addresses in the selected account group so NFTs show when
 * e.g. Solana is selected (NFTs are keyed by EVM address in controller).
 *
 * Only returns NFTs that are currently owned (isCurrentlyOwned === true),
 * matching the same logic used by NftGrid.
 *
 * @returns Array of owned NFTs
 */
const useOwnedNfts = (): Nft[] => {
  const { listPopularNetworks } = useNetworkEnablement();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const addressesOverride = useMemo(
    () =>
      selectedGroupAccounts?.length > 0
        ? selectedGroupAccounts.map((a) => a.address)
        : undefined,
    [selectedGroupAccounts],
  );
  const popularChainIds = useMemo(
    () => listPopularNetworks(),
    // Re-run when network config changes so list reflects add/remove network.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listPopularNetworks, networkConfigurations],
  );

  const nftsByChain = useSelector((state: RootState) =>
    multichainCollectiblesByEnabledNetworksSelector(
      state,
      popularChainIds,
      addressesOverride,
    ),
  ) as Record<string, Nft[]>;

  return useMemo(() => {
    const allNfts = Object.values(nftsByChain).flat();
    return allNfts.filter((nft) => nft.isCurrentlyOwned);
  }, [nftsByChain]);
};

export default useOwnedNfts;
