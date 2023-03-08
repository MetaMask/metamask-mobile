export interface ApproveTransactionHeaderI {
  spenderAddress: string;
  origin: string;
  url: string;
  currentEnsName?: string;
}

export interface AccountInfoI {
  balance: number;
  currency: string;
  accountName: string;
  networkName: string;
}

export interface OriginsI {
  isOriginDeepLink: boolean;
  isOriginWalletConnect: boolean;
  isOriginMMSDKRemoteConn: boolean;
}
