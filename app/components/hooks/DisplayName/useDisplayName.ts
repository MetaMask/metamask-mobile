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
  SavedName = 'SavedName',

  /**
   * The display name is provided by MetaMask for a known token or contract.
   *
   * MetaMask recognizes certain tokens and contracts and provides a default
   * display name for them.
   */
  RecognizedName = 'RecognizedName',

  /**
   * The address is not known to MetaMask and the user has not saved a custom
   * name. The address itself is used as the display name.
   */
  UnknownAddress = 'UnknownAddress',
}
export interface DisplayName {
  /**
   * The type of this display name.
   */
  variant: DisplayNameVariant;
  /**
   * The name to display.
   */
  name: string;
}

/**
 * Get the display name for the given address.
 *
 * @param address The address to get the display name for.
 */
const useDisplayName: (address: string) => DisplayName = (address) => ({
  variant: DisplayNameVariant.UnknownAddress,
  name: address,
});

export default useDisplayName;
