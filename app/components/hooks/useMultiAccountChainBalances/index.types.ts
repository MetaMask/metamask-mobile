export interface ChainFiatBalances {
  [address: string]: {
    [chainId: string]: {
      totalNativeFiatBalance: number;
      totalImportedTokenFiatBalance: number;
      totalFiatBalance: number;
    };
  };
}
