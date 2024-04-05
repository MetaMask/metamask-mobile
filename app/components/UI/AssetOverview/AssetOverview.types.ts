export interface Asset {
  isETH: boolean | undefined;
  decimals: number;
  name: string;
  symbol: string;
  balanceError: boolean | undefined;
  address: string;
}
