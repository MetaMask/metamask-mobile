/**
 * Enum to track states of the permissions screen.
 */
export enum AccountPermissionsScreens {
  Connected = 'Connected',
  ConnectMoreAccounts = 'ConnectMoreAccounts',
  EditAccountsPermissions = 'EditAccountsPermissions',
  ConnectMoreNetworks = 'ConnectMoreNetworks',
  Revoke = 'Revoke',
  PermissionsSummary = 'PermissionsSummary',
  ChooseFromPermittedNetworks = 'ChooseFromPermittedNetworks',
  AddAccount = 'AddAccount',
}

export interface AccountPermissionsParams {
  hostInfo: {
    metadata: { origin: string };
  };
  isRenderedAsBottomSheet?: boolean;
  initialScreen?: AccountPermissionsScreens;
  isNonDappNetworkSwitch?: boolean;
}
