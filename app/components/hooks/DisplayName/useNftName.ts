import { UseDisplayNameRequest } from './useDisplayName';
import { useNftCollectionsMetadata } from './useNftCollectionsMetadata';

export interface UseNFTNameResponse {
  nftCollectionName: string | undefined;
  nftCollectionImage: string | undefined;
}

/**
 * Get the display name and image for the given value.
 *
 * @param value The value to get the display name for.
 */
export function useNftNames(
  requests: UseDisplayNameRequest[],
): UseNFTNameResponse[] {
  const nftCollections = useNftCollectionsMetadata(requests);

  return requests.map(({ value }) => {
    const nftCollectionProperties = nftCollections[value.toLowerCase()];

    const isNotSpam = nftCollectionProperties?.isSpam === false;

    const nftCollectionName = isNotSpam
      ? nftCollectionProperties?.name
      : undefined;
    const nftCollectionImage = isNotSpam
      ? nftCollectionProperties?.image
      : undefined;

    return {
      nftCollectionName,
      nftCollectionImage,
    };
  });
}
