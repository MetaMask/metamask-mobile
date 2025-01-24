export interface BrowserTab {
  id: string;
  url: string;
}
export interface TokensI {
  /**
   * Array of assets (in this case ERC20 tokens)
   */
  tokens: TokenI[];
}

export interface TokenI {
  address: string;
  aggregators: string[];
  decimals: number;
  image: string;
  name: string;
  symbol: string;
  balance: string;
  balanceFiat: string;
  logo: string | undefined;
  isETH: boolean | undefined;
  hasBalanceError?: boolean;
  isStaked?: boolean | undefined;
  nativeAsset?: TokenI | undefined;
  chainId?: string;
  isNative?: boolean;
  ticker?: string;
}
