import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Nft } from '@metamask/assets-controllers';
import { useNetworkEnablement } from '../../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { makeSelectMultichainCollectiblesByEnabledNetworks } from '../../../../../../selectors/nftController';

/**
 * Hook to get all owned NFTs for the currently selected account.
 * Uses popular networks (from useNetworkEnablement).
 * Aggregates from all addresses in the selected account group so NFTs show when
 * e.g. Solana is selected (NFTs are keyed by EVM address in controller).
 * Only returns NFTs that are currently owned (isCurrentlyOwned === true),
 * matching the same logic used by NftGrid.
 *
 * @returns Array of owned NFTs
 */
const useOwnedNfts = (): Nft[] => {
  const { popularNetworks } = useNetworkEnablement();
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
  const popularChainIdsKey = (popularNetworks ?? []).join(',');
  const popularChainIds = useMemo(
    () => (popularChainIdsKey ? popularChainIdsKey.split(',') : undefined),
    [popularChainIdsKey],
  );

  const selectNftsByChain = useMemo(
    () =>
      makeSelectMultichainCollectiblesByEnabledNetworks(
        popularChainIds,
        addressesOverride,
      ),
    [popularChainIds, addressesOverride],
  );
  const nftsByChain = useSelector(selectNftsByChain);

  return useMemo(() => {
    const allNfts = Object.values(nftsByChain ?? {}).flat();
    return allNfts.filter((nft) => nft.isCurrentlyOwned);
  }, [nftsByChain]);
};

export default useOwnedNfts;
