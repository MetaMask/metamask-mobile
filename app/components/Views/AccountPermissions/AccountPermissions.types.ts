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
}

/**
 * AccountPermissions props.
 */
export interface AccountPermissionsProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params: {
      hostInfo: {
        metadata: { origin: string };
      };
      isRenderedAsBottomSheet?: boolean;
      initialScreen?: AccountPermissionsScreens;
      // TODO: remove isNonDappNetworkSwitch prop once the per-dapp network switch is implemented
      isNonDappNetworkSwitch?: boolean;
    };
  };
}
