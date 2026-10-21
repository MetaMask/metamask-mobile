import type { WalletOptions } from '@metamask/wallet';
import type { CaipChainId } from '@metamask/utils';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from '../../../Permissions/specifications';
import { getSnapPermissionSpecifications } from '../../../Snaps/permissions/specifications';
import type { PermissionControllerInitMessenger } from '../messengers/permission-controller-messenger';

type PermissionControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['permissionController']
>;

export function getPermissionControllerInstanceOptions(
  messenger: PermissionControllerInitMessenger,
): PermissionControllerInstanceOptions {
  return {
    caveatSpecifications: getCaveatSpecifications({
      listAccounts: (...args) =>
        messenger.call('AccountsController:listAccounts', ...args),
      findNetworkClientIdByChainId: (...args) =>
        messenger.call(
          'NetworkController:findNetworkClientIdByChainId',
          ...args,
        ),
      isNonEvmScopeSupported: (scope) =>
        messenger.call(
          'MultichainRoutingService:isSupportedScope',
          scope as CaipChainId,
        ),
      getNonEvmAccountAddresses: (scope) =>
        messenger.call(
          'MultichainRoutingService:getSupportedAccounts',
          scope as CaipChainId,
        ),
    }),
    permissionSpecifications: {
      ...getPermissionSpecifications(),
      ...getSnapPermissionSpecifications(messenger),
    },
    unrestrictedMethods,
  };
}
