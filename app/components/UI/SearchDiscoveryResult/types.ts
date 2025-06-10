import { Hex } from '@metamask/utils';

export interface SearchDiscoveryResultProps {
  result: SearchDiscoveryResultItem;
  onSelect: (item: SearchDiscoveryResultItem) => void;
}


export enum SearchDiscoveryCategory {
    Sites = 'sites',
    Recents = 'recents',
    Favorites = 'favorites',
    Tokens = 'tokens',
  }

  /**
   * The result of a Fuse search
   */
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export type FuseSearchResult = {
    category: SearchDiscoveryCategory.Sites | SearchDiscoveryCategory.Recents | SearchDiscoveryCategory.Favorites;
    url: string;
    name: string;
  };

  /**
   * The result of a token search
   */
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export type TokenSearchDiscoveryResult = {
    category: SearchDiscoveryCategory.Tokens;
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

  export type SearchDiscoveryResultItem = FuseSearchResult | TokenSearchDiscoveryResult;
