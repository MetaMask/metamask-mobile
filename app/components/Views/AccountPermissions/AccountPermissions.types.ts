/**
 * Enum to track states of the permissions screen.
 */
export enum AccountPermissionsScreens {
  Connected = 'Connected',
  Connect = 'Connect',
  Revoke = 'Revoke',
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
