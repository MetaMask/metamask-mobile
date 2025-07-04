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
  chainId?: string;
  networkClientId?: string;
  origin?: string;
  url: string;
  currentEnsName?: string;
  from: string;
  asset: Asset;
  dontWatchAsset?: boolean;
  sdkDappMetadata?: {
    url: string;
    icon: string;
  };
}
