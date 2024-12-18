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

export function getSnapIdFromRequest(
  request: Record<string, unknown>,
): SnapId | null {
  const { snapId } = request;
  return typeof snapId === 'string' ? snapId as SnapId : null;
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
    getUnlockPromise: () => Promise.resolve(),
    getSnaps: controllerMessenger.call.bind(
      controllerMessenger,
      'SnapController:getPermitted',
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
      'SnapController:getFile',
      origin,
    ),
    installSnaps: controllerMessenger.call.bind(
      controllerMessenger,
      'SnapController:install',
      origin,
    ),
    invokeSnap: engineContext.PermissionController.executeRestrictedMethod.bind(
      engineContext.PermissionController,
      origin,
      RestrictedMethods.wallet_snap,
    ),
    getSnap: controllerMessenger.call.bind(
      controllerMessenger,
      'SnapController:get',
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
  });

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
