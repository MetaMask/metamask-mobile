import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { SubjectMetadataControllerMessenger } from '@metamask/permission-controller';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the subject metadata controller. This is scoped to the
 * actions and events that the subject metadata controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SubjectMetadataControllerMessenger.
 */
export function getSubjectMetadataControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SubjectMetadataControllerMessenger>,
    MessengerEvents<SubjectMetadataControllerMessenger>
  >,
): SubjectMetadataControllerMessenger {
  const messenger: SubjectMetadataControllerMessenger = new Messenger({
    namespace: 'SubjectMetadataController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['PermissionController:hasPermissions'],
    events: [],
    messenger,
  });
  return messenger;
}
