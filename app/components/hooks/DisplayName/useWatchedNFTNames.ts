import { useSelector } from 'react-redux';
import { UseDisplayNameRequest } from './useDisplayName';
import { selectAllNftContracts } from '../../../selectors/nftController';
import { Hex } from '@metamask/utils';
import { NameType } from '../../UI/Name/Name.types';

export const useWatchedNFTNames = (
  requests: UseDisplayNameRequest[],
): (string | null)[] => {
  const nftContractsByChainIdByAccount = useSelector(selectAllNftContracts);

  return requests.map(({ type, value, variation }) => {
    if (type !== NameType.EthereumAddress || !value) {
      return null;
    }

    const contractAddress = value.toLowerCase();
    const chainId = variation as Hex;
    const accounts = Object.keys(nftContractsByChainIdByAccount);

    const chainNfts = accounts.flatMap(
      (account) => nftContractsByChainIdByAccount[account]?.[chainId] ?? [],
    );

    const watchedNft = chainNfts.find(
      (nft) => nft.address.toLowerCase() === contractAddress,
    );

    return watchedNft?.name ?? null;
  });
};
