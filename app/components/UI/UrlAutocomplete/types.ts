/**
 * Props for the UrlAutocomplete component
 */

import { Hex } from '@metamask/utils';

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
  category: 'sites' | 'recents' | 'favorites';
  url: string;
  name: string;
};

/**
 * The result of a token search
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TokenSearchResult = {
  category: 'tokens';
  name: string;
  symbol: string;
  address: string;
  chainId: Hex;
  logoUrl?: string;
  price: number;
  percentChange: number;
};

export type AutocompleteSearchResult = FuseSearchResult | TokenSearchResult;
