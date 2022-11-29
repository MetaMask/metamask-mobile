import { ImageSourcePropType } from 'react-native';

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
  networkImage: ImageSourcePropType | null;
}

export interface OriginsI {
  isOriginDeepLink: boolean;
  isOriginWalletConnect: boolean;
  isOriginMMSDKRemoteConn: boolean;
}
