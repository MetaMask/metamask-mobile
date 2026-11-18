import Engine from '../../Engine';

/**
 * Revokes every permission granted to an SDK v1 channel.
 * SDK v1 stores channel authority under the bare channelId subject.
 *
 * @param channelId - The SDK channel id used as the permission subject.
 * @throws If the PermissionController is unavailable or the revoke fails.
 */
export const revokeChannelPermissions = (channelId: string) => {
  const { PermissionController } = Engine.context;

  if (PermissionController.getPermissions(channelId)) {
    PermissionController.revokeAllPermissions(channelId);
  }
};

export default revokeChannelPermissions;
