interface Asset {
  isETH?: boolean;
  tokenId?: string;
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  name?: string;
  standard?: string;
}

export interface ApproveTransactionHeaderI {
  origin: string;
  url: string;
  currentEnsName?: string;
  from: string;
  asset: Asset;
}
