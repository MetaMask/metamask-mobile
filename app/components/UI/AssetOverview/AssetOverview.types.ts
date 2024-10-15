export interface Asset {
  isETH: boolean | undefined;
  decimals: number;
  name: string;
  symbol: string;
  hasBalanceError: boolean;
  address: string;
}
