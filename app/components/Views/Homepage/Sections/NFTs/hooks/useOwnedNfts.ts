import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Nft } from '@metamask/assets-controllers';
import { multichainCollectiblesByEnabledNetworksSelector } from '../../../../../../reducers/collectibles';

/**
 * Hook to get all owned NFTs for the currently selected account
 * across enabled networks.
 *
 * Only returns NFTs that are currently owned (isCurrentlyOwned === true),
 * matching the same logic used by NftGrid.
 *
 * @returns Array of owned NFTs
 */
const useOwnedNfts = (): Nft[] => {
  const nftsByChain = useSelector(
    multichainCollectiblesByEnabledNetworksSelector,
  ) as Record<string, Nft[]>;

  return useMemo(() => {
    const allNfts = Object.values(nftsByChain).flat();
    return allNfts.filter((nft) => nft.isCurrentlyOwned);
  }, [nftsByChain]);
};

export default useOwnedNfts;
