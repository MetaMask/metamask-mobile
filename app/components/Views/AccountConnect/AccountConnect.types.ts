/**
 * Enum to track states of the connect screen.
 */
export enum AccountConnectScreens {
  SingleConnect = 'SingleConnect',
  SingleConnectSelector = 'SingleConnectSelector',
  MultiConnectSelector = 'MultiConnectSelector',
}

/**
 * AccountConnect props.
 */
export interface AccountConnectProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params: {
      hostInfo: {
        metadata: { origin: string };
      };
      permissionRequestId: string;
    };
  };
}
