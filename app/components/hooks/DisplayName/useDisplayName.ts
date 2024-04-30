import { useSelector } from 'react-redux';
import { NftContract } from '@metamask/assets-controllers';
import { NameType } from '../../UI/Name/Name.types';
import { mapCollectibleContractsSelector } from '../../../reducers/collectibles';

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
const useDisplayName: (type: NameType, value: string) => DisplayName = (
  _type,
  value,
) => {
  const normalizedValue = value.toLowerCase();

  const watchedNftNames: Record<string, NftContract> = useSelector(
    mapCollectibleContractsSelector,
  );
  const watchedNftName = watchedNftNames[normalizedValue]?.name;

  if (watchedNftName) {
    return {
      variant: DisplayNameVariant.Recognized,
      name: watchedNftName,
    };
  }

  return {
    variant: DisplayNameVariant.Unknown,
  };
};

export default useDisplayName;
