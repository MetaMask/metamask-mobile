/* eslint-disable @typescript-eslint/no-explicit-any */
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import {
  RequestedPermissions,
  SubjectType,
} from '@metamask/permission-controller';
import { RestrictedMethods } from '../Permissions/constants';
import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';

/**
 * Passes a JSON-RPC request object to the SnapController for execution.
 *
 * @param {object} args - A bag of options.
 * @param {string} args.snapId - The ID of the recipient snap.
 * @param {string} args.origin - The origin of the RPC request.
 * @param {string} args.handler - The handler to trigger on the snap for the request.
 * @param {object} args.request - The JSON-RPC request object.
 * @returns The result of the JSON-RPC request.
 */
async function handleSnapRequest(
  controllerMessenger: any,
  subjectType: SubjectType,
  snapId: string,
  origin: string,
  handler: any,
  request: any,
) {
  // eslint-disable-next-line no-console
  console.log(
    'Accounts/ handleSnapRequest called with args',
    subjectType,
    snapId,
    origin,
    handler,
    request,
  );
  return await controllerMessenger.call(
    'SnapController:handleRequest',
    snapId,
    origin,
    handler,
    request,
  );
}

// Snaps middleware
/*
    from extension https://github.dev/MetaMask/metamask-extension/blob/1d5e8a78400d7aaaf2b3cbdb30cff9399061df34/app/scripts/metamask-controller.js#L3830-L3861
    */
const snapMethodMiddlewareBuilder = (
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineContext: any,
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
    handleSnapRpcRequest: () =>
      handleSnapRequest(
        controllerMessenger,
        subjectType,
        'npm:@metamask/snap-simple-keyring-snap',
        origin,
        null,
        null,
      ),
  });

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
