///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import {
  RequestedPermissions,
  SubjectType,
} from '@metamask/permission-controller';
import { SnapRpcHookArgs } from '@metamask/snaps-utils';
import { RestrictedMethods } from '../Permissions/constants';
import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { SnapId } from '@metamask/snaps-sdk';
import { EngineContext } from '../Engine';
import { handleSnapRequest } from './utils';
import {
  SnapControllerGetPermittedSnapsAction,
  SnapControllerGetSnapAction,
  SnapControllerGetSnapFileAction,
  SnapControllerInstallSnapsAction,
} from '../Engine/controllers/SnapController/constants';

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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controllerMessenger: any,
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
      origin,
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
      'SnapInterfaceController:createInterface',
      origin,
    ),
    updateInterface: controllerMessenger.call.bind(
      controllerMessenger,
      'SnapInterfaceController:updateInterface',
      origin,
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getInterfaceContext: (...args: any) =>
      controllerMessenger.call(
        'SnapInterfaceController:getInterface',
        origin,
        ...args,
      ).context,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getInterfaceState: (...args: any) =>
      controllerMessenger.call(
        'SnapInterfaceController:getInterface',
        origin,
        ...args,
      ).state,
    resolveInterface: controllerMessenger.call.bind(
      controllerMessenger,
      'SnapInterfaceController:resolveInterface',
      origin,
    ),
    getSnap: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapAction,
    ),
    updateInterfaceState: controllerMessenger.call.bind(
      controllerMessenger,
      'SnapInterfaceController:updateInterfaceState',
      origin,
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
  });

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
