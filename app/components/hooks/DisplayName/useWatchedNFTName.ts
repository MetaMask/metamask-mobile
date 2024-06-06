import { useSelector } from 'react-redux';
import { NftContract } from '@metamask/assets-controllers';
import { collectibleContractsSelector } from '../../../reducers/collectibles';

export interface UseWatchedNFTNameRequest {
  value: string;
}

export const useWatchedNFTNames = (
  requests: UseWatchedNFTNameRequest[],
): (string | null | undefined)[] => {
  const watchedNfts: NftContract[] = useSelector(collectibleContractsSelector);

  return requests.map((request) => {
    const normalizedValue = request.value.toLowerCase();
    const watchedNft = watchedNfts.find(
      (nft) => nft.address.toLowerCase() === normalizedValue,
    );

    return watchedNft?.name ?? null;
  });
};

/**
 * Get the name for the given NFT Address for the current chain.
 *
 * @param address The address of the NFT.
 */
export const useWatchedNFTName: (value: string) => string | null | undefined = (
  value,
) => useWatchedNFTNames([{ value }])[0];
