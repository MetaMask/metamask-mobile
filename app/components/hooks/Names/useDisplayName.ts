/**
 * Indicate the source and nature of the display name.
 */
export enum DisplayNameType {
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
   * The display name is just the address itself since it was not recognized 
   * or saved.
   *
   * If the address is not known to MetaMask and the user has not saved
   * a custom name, the address itself is used as the display name.
   */
  UnknownAddress = 'UnknownAddress',
}
export interface DisplayName {
  /**
   * The type of display name.
   */
  type: DisplayNameType;
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
  type: DisplayNameType.UnknownAddress,
  name: address,
});

export default useDisplayName;
