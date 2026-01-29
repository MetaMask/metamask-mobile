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
  Tokens = 'tokens',
  Perps = 'perps',
  Predictions = 'predictions',
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

/**
 * The result of a token search
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TokenSearchResult = {
  category: UrlAutocompleteCategory.Tokens;
  assetId: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  chainId: Hex;
  logoUrl?: string;
  price: number;
  percentChange: number;
  isFromSearch: true;
};

/**
 * The result of a perps market search
 * Re-exports PerpsMarketData from the Perps controller with category added
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsSearchResult = {
  category: UrlAutocompleteCategory.Perps;
  symbol: string;
  name: string;
  maxLeverage: string;
  price: string;
  change24h: string;
  change24hPercent: string;
  volume: string;
  openInterest?: string;
  marketType?: 'crypto' | 'equity' | 'commodity' | 'forex';
  marketSource?: string | null;
};

/**
 * The result of a predictions market search
 * Re-exports PredictMarket from Predict types with category added
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictionsSearchResult = {
  category: UrlAutocompleteCategory.Predictions;
  id: string;
  providerId: string;
  slug: string;
  title: string;
  description: string;
  endDate?: string;
  image: string;
  status: 'open' | 'closed' | 'resolved';
  liquidity: number;
  volume: number;
};

export type AutocompleteSearchResult =
  | FuseSearchResult
  | TokenSearchResult
  | PerpsSearchResult
  | PredictionsSearchResult;
