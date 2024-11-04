import { Hex } from '@metamask/utils';
import { NameType } from '../../UI/Name/Name.types';
import { useFirstPartyContractNames } from './useFirstPartyContractName';
import { useWatchedNFTNames } from './useWatchedNFTName';
import { useTokenListEntries } from './useTokenListEntry';
import { useNftCollectionsMetadata } from './useNftCollectionsMetadata';

export interface UseDisplayNameRequest {
  value: string;
  type: NameType;
  chainId?: Hex;
  preferContractSymbol?: boolean;
}

export interface UseDisplayNameResponse {
  name: string | null | undefined;
  contractDisplayName?: string;
  image?: string;
  variant: DisplayNameVariant;
}

/**
 * Indicate the source and nature of a display name for a given address.
 */
export enum DisplayNameVariant {
  /**
   * The display name was saved by the user for the given address.
   *
   * This indicates that the user has manually set a custom "petname"
   * for the address.
   */
  Saved = 'Saved',

  /**
   * The display name is provided by MetaMask for a known token or contract.
   *
   * MetaMask recognizes certain tokens and contracts and provides a default
   * display name for them.
   */
  Recognized = 'Recognized',

  /**
   * The address is not known to MetaMask and the user has not saved a custom
   * name.
   */
  Unknown = 'Unknown',
}

export type DisplayName =
  | { variant: DisplayNameVariant.Unknown }
  | {
      variant: DisplayNameVariant.Saved | DisplayNameVariant.Recognized;
      /**
       * The name to display.
       */
      name: string;
    };

/**
 * Get the display name for the given value.
 *
 * @param type The NameType to get the display name for.
 * @param value The value to get the display name for.
 */
const useDisplayName: (
  type: NameType,
  value: string,
  chainId?: Hex,
  preferContractSymbol?: boolean,
) => UseDisplayNameResponse = (type, value, chainId, preferContractSymbol) =>
  useDisplayNames([{ value, type, chainId, preferContractSymbol }])[0];

export function useDisplayNames(
  requests: UseDisplayNameRequest[],
): UseDisplayNameResponse[] {
  const firstPartyContractNames = useFirstPartyContractNames(requests);
  const watchedNftNames = useWatchedNFTNames(requests);
  const tokenListNames = useTokenListEntries(requests);
  const nftCollections = useNftCollectionsMetadata(requests);

  return requests.map(({ preferContractSymbol, value }, index) => {
    const watchedNftName = watchedNftNames[index];
    const firstPartyContractName = firstPartyContractNames[index];
    const tokenListName = tokenListNames[index];
    const contractDisplayName =
      preferContractSymbol && tokenListName?.symbol
        ? tokenListName.symbol
        : tokenListName?.name;
    const nftCollectionProperties = nftCollections[value.toLowerCase()];

    const isNotSpam = nftCollectionProperties?.isSpam === false;

    const nftCollectionName = isNotSpam
      ? nftCollectionProperties?.name
      : undefined;
    const nftCollectionImage = isNotSpam
      ? nftCollectionProperties?.image
      : undefined;

    const recognizedName =
      watchedNftName ||
      firstPartyContractName ||
      contractDisplayName ||
      nftCollectionName;

    if (recognizedName) {
      return {
        variant: DisplayNameVariant.Recognized,
        contractDisplayName,
        name: recognizedName,
        image: nftCollectionImage,
      };
    }

    return {
      variant: DisplayNameVariant.Unknown,
      name: null,
    };
  });
}

export default useDisplayName;
