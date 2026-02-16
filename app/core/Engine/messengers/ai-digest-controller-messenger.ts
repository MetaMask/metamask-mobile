import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { AiDigestControllerMessenger } from '@metamask-previews/ai-controllers';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the AI digest controller.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AiDigestControllerMessenger.
 */
export function getAiDigestControllerMessenger(
  rootMessenger: RootMessenger,
): AiDigestControllerMessenger {
  return new Messenger<
    'AiDigestController',
    MessengerActions<AiDigestControllerMessenger>,
    MessengerEvents<AiDigestControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AiDigestController',
    parent: rootMessenger,
  });
}
