import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import {
  RootExtendedMessenger,
  RootMessenger,
} from '../../../core/Engine/types';
import type { SamplePetnamesControllerMessenger } from '@metamask/sample-controllers';

/**
 * Get the messenger for the SamplePetnamesController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The SamplePetnamesControllerMessenger.
 */
export function getSamplePetnamesControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): SamplePetnamesControllerMessenger {
  const messenger = new Messenger<
    'SamplePetnamesController',
    MessengerActions<SamplePetnamesControllerMessenger>,
    MessengerEvents<SamplePetnamesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SamplePetnamesController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
