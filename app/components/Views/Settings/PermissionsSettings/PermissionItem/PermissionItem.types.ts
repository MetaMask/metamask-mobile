export enum PermissionSource {
  WalletConnect = 'WalletConnect',
  SDK = 'SDK',
  MetaMaskBrowser = 'MetaMaskBrowser',
}

export interface PermissionListItemViewModel {
  dappLogoUrl: string;
  dappOrigin: string;
  numberOfAccountPermissions: number;
  numberOfNetworkPermissions: number;
  permissionSource: PermissionSource;
}
