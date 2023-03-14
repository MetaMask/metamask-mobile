export interface ApproveTransactionHeaderI {
  origin: string;
  url: string;
  currentEnsName?: string;
  from: string;
  tokenSymbol?: string;
  tokenBalance?: number;
  fetchingTokenBalance?: boolean;
}

export interface AccountInfoI {
  balance: number;
  currency: string;
  accountName: string;
}

export interface OriginsI {
  isOriginDeepLink: boolean;
  isOriginWalletConnect: boolean;
  isOriginMMSDKRemoteConn: boolean;
}
