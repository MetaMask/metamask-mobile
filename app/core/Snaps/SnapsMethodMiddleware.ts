///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import {
  RequestedPermissions,
  SubjectType,
} from '@metamask/permission-controller';
import { SnapRpcHookArgs } from '@metamask/snaps-utils';
import { RestrictedMethods } from '../Permissions/constants';
import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { BackgroundEvent, SnapId } from '@metamask/snaps-sdk';
import { BaseControllerMessenger, EngineContext } from '../Engine';
import { handleSnapRequest } from './utils';
import {
  CronjobControllerCancelBackgroundEventAction,
  CronjobControllerGetBackgroundEventsAction,
  SnapControllerClearSnapStateAction,
  SnapControllerGetPermittedSnapsAction,
  SnapControllerGetSnapAction,
  SnapControllerGetSnapFileAction,
  SnapControllerGetSnapStateAction,
  SnapControllerInstallSnapsAction,
  SnapControllerUpdateSnapStateAction,
  SnapInterfaceControllerCreateInterfaceAction,
  SnapInterfaceControllerResolveInterfaceAction,
  SnapInterfaceControllerUpdateInterfaceAction,
  SnapInterfaceControllerUpdateInterfaceStateAction,
} from '../Engine/controllers/snaps';
import { KeyringTypes } from '@metamask/keyring-controller';

export function getSnapIdFromRequest(
  request: Record<string, unknown>,
): SnapId | null {
  const { snapId } = request;
  return typeof snapId === 'string' ? (snapId as SnapId) : null;
}
// Snaps middleware
/*
    from extension https://github.dev/MetaMask/metamask-extension/blob/1d5e8a78400d7aaaf2b3cbdb30cff9399061df34/app/scripts/metamask-controller.js#L3830-L3861
    */
const snapMethodMiddlewareBuilder = (
  engineContext: EngineContext,
  controllerMessenger: BaseControllerMessenger,
  origin: string,
  subjectType: SubjectType,
) =>
  createSnapsMethodMiddleware(subjectType === SubjectType.Snap, {
    getUnlockPromise: () => {
      if (engineContext.KeyringController.isUnlocked()) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        controllerMessenger.subscribeOnceIf(
          'KeyringController:unlock',
          resolve,
          () => true,
        );
      });
    },
    getSnaps: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetPermittedSnapsAction,
      origin,
    ),
    requestPermissions: async (requestedPermissions: RequestedPermissions) =>
      await engineContext.PermissionController.requestPermissions(
        { origin },
        requestedPermissions,
      ),
    getPermissions: engineContext.PermissionController.getPermissions.bind(
      engineContext.PermissionController,
      origin,
    ),
    hasPermission: engineContext.PermissionController.hasPermission.bind(
      engineContext.PermissionController,
      origin,
    ),
    getAllowedKeyringMethods: keyringSnapPermissionsBuilder(origin),
    getSnapFile: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapFileAction,
      origin as SnapId,
    ),
    installSnaps: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerInstallSnapsAction,
      origin,
    ),
    invokeSnap: engineContext.PermissionController.executeRestrictedMethod.bind(
      engineContext.PermissionController,
      origin,
      RestrictedMethods.wallet_snap,
    ),
    createInterface: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerCreateInterfaceAction,
      origin as SnapId,
    ),
    updateInterface: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerUpdateInterfaceAction,
      origin as SnapId,
    ),
    getInterfaceContext: (id: string) =>
      controllerMessenger.call(
        'SnapInterfaceController:getInterface',
        origin as SnapId,
        id,
      ).context,
    getInterfaceState: (id: string) =>
      controllerMessenger.call(
        'SnapInterfaceController:getInterface',
        origin as SnapId,
        id,
      ).state,
    resolveInterface: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerResolveInterfaceAction,
      origin as SnapId,
    ),
    getSnap: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapAction,
    ),
    updateInterfaceState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerUpdateInterfaceStateAction,
      origin as SnapId,
    ),
    handleSnapRpcRequest: async (request: Omit<SnapRpcHookArgs, 'origin'>) => {
      const snapId = getSnapIdFromRequest(request);

      if (!snapId) {
        throw new Error(
          'snapMethodMiddlewareBuilder handleSnapRpcRequest: Invalid snap request: snapId not found',
        );
      }

      return await handleSnapRequest(controllerMessenger, {
        snapId,
        origin,
        handler: request.handler,
        request: request.request,
      });
    },
    requestUserApproval:
      engineContext.ApprovalController.addAndShowApprovalRequest.bind(
        engineContext.ApprovalController,
      ),
    getIsLocked: () => !engineContext.KeyringController.isUnlocked(),
    getEntropySources: () => {
      const state = controllerMessenger.call('KeyringController:getState');

      return state.keyrings
        .map((keyring, index) => {
          if (keyring.type === KeyringTypes.hd) {
            return {
              id: state.keyringsMetadata[index].id,
              name: state.keyringsMetadata[index].name,
              type: 'mnemonic',
              primary: index === 0,
            };
          }

          return null;
        })
        .filter(Boolean);
    },
    clearSnapState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerClearSnapStateAction,
      origin as SnapId,
    ),
    getSnapState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapStateAction,
      origin as SnapId,
    ),
    updateSnapState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerUpdateSnapStateAction,
      origin as SnapId,
    ),
    scheduleBackgroundEvent: (
      event: Omit<BackgroundEvent, 'id' | 'scheduledAt'>,
    ) =>
      controllerMessenger.call('CronjobController:scheduleBackgroundEvent', {
        ...event,
        snapId: origin as SnapId,
      }),
    cancelBackgroundEvent: controllerMessenger.call.bind(
      controllerMessenger,
      CronjobControllerCancelBackgroundEventAction,
      origin as SnapId,
    ),
    getBackgroundEvents: controllerMessenger.call.bind(
      controllerMessenger,
      CronjobControllerGetBackgroundEventsAction,
      origin as SnapId,
    ),
    getNetworkConfigurationByChainId: controllerMessenger.call.bind(
      controllerMessenger,
      'NetworkController:getNetworkConfigurationByChainId',
    ),
    getNetworkClientById: controllerMessenger.call.bind(
      controllerMessenger,
      'NetworkController:getNetworkClientById',
    ),
  });

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
