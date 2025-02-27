import { NameType } from '../../UI/Name/Name.types';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { useWatchedNFTNames } from './useWatchedNFTNames';
import { useERC20Tokens } from './useERC20Tokens';
import { useNftNames } from './useNftName';

export interface UseDisplayNameRequest {
  preferContractSymbol?: boolean;
  type: NameType;
  value: string;
  variation: string;
}

export interface UseDisplayNameResponse {
  contractDisplayName?: string;
  image?: string;
  name?: string;
  variant: DisplayNameVariant;
  isFirstPartyContractName?: boolean;
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
export function useDisplayName(
  request: UseDisplayNameRequest,
): UseDisplayNameResponse {
  return useDisplayNames([request])[0];
}

export function useDisplayNames(
  requests: UseDisplayNameRequest[],
): UseDisplayNameResponse[] {
  const firstPartyContractNames = useFirstPartyContractNames(requests);
  const watchedNftNames = useWatchedNFTNames(requests);
  const erc20Tokens = useERC20Tokens(requests);
  const nftNames = useNftNames(requests);

  return requests.map((_request, index) => {
    const watchedNftName = watchedNftNames[index];
    const firstPartyContractName = firstPartyContractNames[index];
    const erc20Token = erc20Tokens[index];
    const { name: nftCollectionName, image: nftCollectionImage } =
      nftNames[index] || {};

    const name =
      firstPartyContractName ||
      watchedNftName ||
      erc20Token?.name ||
      nftCollectionName;

    const image = erc20Token?.image || nftCollectionImage;

    const isFirstPartyContractName = firstPartyContractName !== undefined &&
      firstPartyContractName !== null;

    return {
      contractDisplayName: erc20Token?.name,
      image,
      name,
      variant: name
        ? DisplayNameVariant.Recognized
        : DisplayNameVariant.Unknown,
      isFirstPartyContractName
    };
  });
}

export default useDisplayName;
