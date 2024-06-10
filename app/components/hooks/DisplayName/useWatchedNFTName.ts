import { useSelector } from 'react-redux';
import { NftContract } from '@metamask/assets-controllers';
import { collectibleContractsSelector } from '../../../reducers/collectibles';

/**
 * Get the name for the given NFT Address for the current chain.
 *
 * @param address The address of the NFT.
 */
const useWatchedNFTName: (address: string) => string | null | undefined = (
  address,
) => {
  const watchedNfts: NftContract[] = useSelector(collectibleContractsSelector);
  const watchedNft = watchedNfts.find(
    (nft) => nft.address.toLowerCase() === address,
  );

  return watchedNft?.name ?? null;
};

export default useWatchedNFTName;
