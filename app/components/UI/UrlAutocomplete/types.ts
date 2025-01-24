/**
 * Props for the UrlAutocomplete component
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UrlAutocompleteComponentProps = {
  /**
   * Callback that is triggered while
   * choosing one of the autocomplete options
   */
  onSelect: (url: string) => void;
  /**
   * Callback that is triggered while
   * tapping on the background
   */
  onDismiss: () => void;
};

/**
 * Ref for the UrlAutocomplete component
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UrlAutocompleteRef = {
  /**
   * Search for autocomplete results
   */
  search: (text: string) => void;
  /**
   * Hide the autocomplete results
   */
  hide: () => void;
  /**
   * Show the autocomplete results
   */
  show: () => void;
};

/**
 * The result of an Fuse search
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FuseSearchResult = {
  url: string;
  name: string;
  type: string;
};
