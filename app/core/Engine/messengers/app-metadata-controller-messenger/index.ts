import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AppMetadataControllerMessenger } from '@metamask/app-metadata-controller';
import { RootMessenger } from '../../types';

/**
 * Get the AppMetadataControllerMessenger for the AppMetadataController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AppMetadataControllerMessenger.
 */
export function getAppMetadataControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AppMetadataControllerMessenger>,
    MessengerEvents<AppMetadataControllerMessenger>
  >,
): AppMetadataControllerMessenger {
  const messenger: AppMetadataControllerMessenger = new Messenger({
    namespace: 'AppMetadataController',
    parent: rootMessenger,
  });
  return messenger;
}
