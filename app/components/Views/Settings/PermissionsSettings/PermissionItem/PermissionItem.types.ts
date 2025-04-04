export enum PermissionSource {
  WalletConnect = 'WalletConnect',
  SDK = 'SDK',
  MetaMaskBrowser = 'MetaMaskBrowser',
}

export interface PermissionListItemViewModel {
  dappLogoUrl: string;
  dappHostName: string;
  numberOfAccountPermissions: number;
  numberOfNetworkPermissions: number;
  permissionSource: PermissionSource;
}
