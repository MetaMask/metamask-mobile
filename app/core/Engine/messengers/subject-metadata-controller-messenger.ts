import { Messenger } from '@metamask/base-controller';
import { HasPermissions } from '@metamask/permission-controller';

type AllowedActions = HasPermissions;

type AllowedEvents = never;

export type SubjectMetadataControllerMessenger = ReturnType<
  typeof getSubjectMetadataControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * subject metadata controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getSubjectMetadataControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'SubjectMetadataController',
    allowedActions: ['PermissionController:hasPermissions'],
    allowedEvents: [],
  });
}
