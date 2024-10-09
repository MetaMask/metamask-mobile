import { RequestedPermissions } from '@metamask/permission-controller';

/**
 * Enum to track states of the connect screen.
 */
export enum AccountConnectScreens {
  SingleConnect = 'SingleConnect',
  SingleConnectSelector = 'SingleConnectSelector',
  MultiConnectSelector = 'MultiConnectSelector',
  MultiConnectNetworkSelector = 'MultiConnectNetworkSelector',
}

export interface AccountConnectParams {
  hostInfo: {
    metadata: { origin: string; id: string };
    permissions: RequestedPermissions;
  };
  permissionRequestId: string;
}

/**
 * AccountConnect props.
 */
export interface AccountConnectProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params: AccountConnectParams;
  };
}
