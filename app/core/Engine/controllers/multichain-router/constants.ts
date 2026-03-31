import {
  MultichainRoutingServiceGetSupportedAccountsAction as MultichainRoutingServiceGetSupportedAccountsActionType,
  MultichainRoutingServiceIsSupportedScopeAction as MultichainRoutingServiceIsSupportedScopeActionType,
} from '@metamask/snaps-controllers';

export const MultichainRoutingServiceIsSupportedScopeAction: MultichainRoutingServiceIsSupportedScopeActionType['type'] =
  'MultichainRoutingService:isSupportedScope';
export const MultichainRoutingServiceGetSupportedAccountsAction: MultichainRoutingServiceGetSupportedAccountsActionType['type'] =
  'MultichainRoutingService:getSupportedAccounts';
