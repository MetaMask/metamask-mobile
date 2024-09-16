/**
 * Enum to track states of the permissions screen.
 */
export enum AccountPermissionsScreens {
  Connected = 'Connected',
  ConnectMoreAccounts = 'ConnectMoreAccounts',
  EditAccountsPermissions = 'EditAccountsPermissions',
  Revoke = 'Revoke',
  PermissionsSummary = 'PermissionsSummary',
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
    };
  };
}
