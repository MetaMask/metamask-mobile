import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AppMetadataControllerMessenger } from '@metamask/app-metadata-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Get the AppMetadataControllerMessenger for the AppMetadataController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AppMetadataControllerMessenger.
 */
export function getAppMetadataControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): AppMetadataControllerMessenger {
  const messenger = new Messenger<
    'AppMetadataController',
    MessengerActions<AppMetadataControllerMessenger>,
    MessengerEvents<AppMetadataControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AppMetadataController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
