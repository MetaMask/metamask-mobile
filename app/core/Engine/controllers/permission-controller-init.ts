import { MessengerClientInitFunction } from '../types';
import {
  PermissionController,
  type PermissionSpecificationConstraint,
  type CaveatSpecificationConstraint,
  type PermissionControllerMessenger,
} from '@metamask/permission-controller';
import { PermissionControllerInitMessenger } from '../messengers/permission-controller-messenger';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from '../../Permissions/specifications';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { getSnapPermissionSpecifications } from '../../Snaps/permissions/specifications';
///: END:ONLY_INCLUDE_IF
import { CaipChainId } from '@metamask/utils';

/**
 * Initialize the permission controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const permissionControllerInit: MessengerClientInitFunction<
  PermissionController<
    PermissionSpecificationConstraint,
    CaveatSpecificationConstraint
  >,
  PermissionControllerMessenger,
  PermissionControllerInitMessenger
> = ({
  controllerMessenger,
  initMessenger,
  persistedState,
  getMessengerClient,
}) => {
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  const keyringController = getMessengerClient('KeyringController');
  ///: END:ONLY_INCLUDE_IF

  const messengerClient = new PermissionController({
    messenger: controllerMessenger,
    state: persistedState.PermissionController,
    caveatSpecifications: getCaveatSpecifications({
      listAccounts: (...args) =>
        initMessenger.call('AccountsController:listAccounts', ...args),
      findNetworkClientIdByChainId: (...args) =>
        initMessenger.call(
          'NetworkController:findNetworkClientIdByChainId',
          ...args,
        ),
      isNonEvmScopeSupported: (scope) =>
        initMessenger.call(
          'MultichainRoutingService:isSupportedScope',
          scope as CaipChainId,
        ),
      getNonEvmAccountAddresses: (scope) =>
        initMessenger.call(
          'MultichainRoutingService:getSupportedAccounts',
          scope as CaipChainId,
        ),
    }),
    permissionSpecifications: {
      ...getPermissionSpecifications(),
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      ...getSnapPermissionSpecifications(initMessenger, {
        addNewKeyring: keyringController.addNewKeyring.bind(keyringController),
      }),
      ///: END:ONLY_INCLUDE_IF
    },
    unrestrictedMethods,
  });

  return {
    messengerClient,
  };
};
