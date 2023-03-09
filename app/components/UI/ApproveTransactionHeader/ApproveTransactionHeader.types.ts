export interface ApproveTransactionHeaderI {
  origin: string;
  url: string;
  currentEnsName?: string;
  from: string;
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
