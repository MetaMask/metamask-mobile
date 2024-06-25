///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import {
  RequestedPermissions,
  SubjectType,
} from '@metamask/permission-controller';
import { RestrictedMethods } from '../Permissions/constants';

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
  });

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
