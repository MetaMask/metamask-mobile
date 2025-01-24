// this duplicate type needs to be combined / refactored with
// app/components/UI/AssetOverview/AssetOverview.types.ts

export interface Asset {
  isETH?: boolean;
  tokenId?: string;
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  name?: string;
  standard?: string;
}
