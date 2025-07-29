import {
  MultichainRouterGetSupportedAccountsAction,
  MultichainRouterIsSupportedScopeAction,
} from '@metamask/snaps-controllers';

export const MultichainRouterIsSupportedScopeEvent: MultichainRouterIsSupportedScopeAction['type'] =
  'MultichainRouter:isSupportedScope';
export const MultichainRouterGetSupportedAccountsEvent: MultichainRouterGetSupportedAccountsAction['type'] =
  'MultichainRouter:getSupportedAccounts';
