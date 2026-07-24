/**
 * SDK navigation parameters
 */

/** SDK loading parameters */
export interface SDKLoadingParams {
  channelId?: string;
}

/** SDK feedback parameters */
export interface SDKFeedbackParams {
  channelId?: string;
}

/** SDK disconnect parameters */
export interface SDKDisconnectParams {
  channelId?: string;
  account?: string;
  accountName?: string;
  dapp?: string;
  accountsLength?: number;
  isV2?: boolean;
}

/** SDK sessions manager list refresh trigger */
export interface SDKSessionsManagerParams {
  trigger?: number;
}

/**
 * Params for the manage-connections sheet (`SDKManageConnections`),
 * which renders `SDKSessionModal`.
 */
export interface SDKManageConnectionsParams {
  channelId?: string;
  icon?: string;
  urlOrTitle: string;
  version?: string;
  platform?: string;
  isV2?: boolean;
}

/** Return to dapp notification parameters */
export interface ReturnToDappNotificationParams {
  dappName?: string;
  dappUrl?: string;
}
