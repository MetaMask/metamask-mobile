import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { useNftCollectionsMetadata } from './useNftCollectionsMetadata';

export interface UseNFTNameResponse {
  name: string | undefined;
  image: string | undefined;
}

/**
 * Get the display name and image for the given value.
 *
 * @param value The value to get the display name for.
 */
export function useNftNames(
  nameRequests: UseDisplayNameRequest[],
): (UseNFTNameResponse | undefined)[] {
  const requests = nameRequests
    .filter(({ type }) => type === NameType.EthereumAddress)
    .map(({ value, variation }) => ({
      chainId: variation,
      contractAddress: value,
    }));

  const nftCollectionsByAddressByChain = useNftCollectionsMetadata(requests);

  return nameRequests.map(
    ({ type, value: contractAddress, variation: chainId }) => {
      if (type !== NameType.EthereumAddress) {
        return undefined;
      }

      const nftCollectionProperties =
        nftCollectionsByAddressByChain[chainId]?.[
          contractAddress.toLowerCase()
        ];

      const isSpam = nftCollectionProperties?.isSpam !== false;

      if (!nftCollectionProperties || isSpam) {
        return undefined;
      }

      const { name, image } = nftCollectionProperties;

      return { name, image };
    },
  );
}
