import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { UseDisplayNameRequest } from './useDisplayName';
import { selectAllNftContracts } from '../../../selectors/nftController';
import { Hex } from '@metamask/utils';
import { NameType } from '../../UI/Name/Name.types';

export const useWatchedNFTNames = (
  requests: UseDisplayNameRequest[],
): (string | null)[] => {
  const nftContractsByChainIdByAccount = useSelector(selectAllNftContracts);

  // Memoize the per-request NFT lookup so the O(accounts × nfts) scan only runs
  // when the requests or the watched-NFT contracts change. The account list is
  // request-independent, so compute it once per memo run rather than per request.
  return useMemo(() => {
    const accounts = Object.keys(nftContractsByChainIdByAccount);

    return requests.map(({ type, value, variation }) => {
      if (type !== NameType.EthereumAddress || !value) {
        return null;
      }

      const contractAddress = value.toLowerCase();
      const chainId = variation as Hex;

      const chainNfts = accounts.flatMap(
        (account) => nftContractsByChainIdByAccount[account]?.[chainId] ?? [],
      );

      const watchedNft = chainNfts.find(
        (nft) => nft.address.toLowerCase() === contractAddress,
      );

      return watchedNft?.name ?? null;
    });
  }, [requests, nftContractsByChainIdByAccount]);
};
