import { PermissionController } from '@metamask/permission-controller';
import Engine from '../../Engine';

/**
 * Revokes every permission granted to an SDK v1 channel.
 * SDK v1 stores channel authority under the bare channelId subject.
 *
 * @param channelId - The SDK channel id used as the permission subject.
 * @throws If the PermissionController is unavailable or the revoke fails.
 */
export const revokeChannelPermissions = (channelId: string) => {
  const permissionsController = (
    Engine.context as {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      PermissionController: PermissionController<any, any>;
    }
  ).PermissionController;

  if (permissionsController.getPermissions(channelId)) {
    permissionsController.revokeAllPermissions(channelId);
  }
};

export default revokeChannelPermissions;
