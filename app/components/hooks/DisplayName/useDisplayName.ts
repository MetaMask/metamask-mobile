import { Hex } from '@metamask/utils';
import { NameType } from '../../UI/Name/Name.types';
import { useFirstPartyContractName } from './useFirstPartyContractName';
import useWatchedNFTName from './useWatchedNFTName';
import { useTokenListName } from './useTokenListName';

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
) => DisplayName = (_type, value, chainId) => {
  const normalizedValue = value.toLowerCase();

  const watchedNftName = useWatchedNFTName(normalizedValue);
  const firstPartyContractName = useFirstPartyContractName(
    normalizedValue,
    chainId,
  );
  const tokenListName = useTokenListName(
    normalizedValue,
    NameType.EthereumAddress,
  );

  const recognizedName =
    watchedNftName || firstPartyContractName || tokenListName;

  if (recognizedName) {
    return {
      variant: DisplayNameVariant.Recognized,
      name: recognizedName,
    };
  }

  return {
    variant: DisplayNameVariant.Unknown,
  };
};

export default useDisplayName;
