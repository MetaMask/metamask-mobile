export enum DisplayNameType {
  /**
   * The display name was saved by the user for the given address.
   */
  SavedName = 'SavedName',

  /**
   * The display name is provided by MetaMask for a known token
   * or contract.
   */
  RecognizedName = 'RecognizedName',

  /**
   * The display name is just the address itself since it was not
   * recognized or saved.
   */
  UnknownAddress = 'UnknownAddress',
}

export interface DisplayName {
  /**
   * The type of display name.
   */
  type: DisplayNameType;
  name: string;
}

/**
 * Get the display name associated with the given address.
 *
 * @param address The address to get the display name for.
 */
const useDisplayName: (address: string) => DisplayName = (address) => ({
  type: DisplayNameType.UnknownAddress,
  name: address,
});

export default useDisplayName;
