/**
 * Props for the UrlAutocomplete component
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UrlAutocompleteComponentProps = {
  /**
   * Callback that is triggered while
   * choosing one of the autocomplete options
   */
  onSelect: (item: AutocompleteSearchResult) => void;
  /**
   * Callback that is triggered while
   * tapping on the background
   */
  onDismiss: () => void;
};

export enum UrlAutocompleteCategory {
  Sites = 'sites',
  Recents = 'recents',
  Favorites = 'favorites',
}

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
 * The result of a Fuse search
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FuseSearchResult = {
  category:
    | UrlAutocompleteCategory.Sites
    | UrlAutocompleteCategory.Recents
    | UrlAutocompleteCategory.Favorites;
  url: string;
  name: string;
};

export type AutocompleteSearchResult = FuseSearchResult;
