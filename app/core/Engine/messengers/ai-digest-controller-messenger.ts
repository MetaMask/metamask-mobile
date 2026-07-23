import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { AiDigestControllerMessenger } from '@metamask/ai-controllers';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the AI digest controller.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AiDigestControllerMessenger.
 */
export function getAiDigestControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AiDigestControllerMessenger>,
    MessengerEvents<AiDigestControllerMessenger>
  >,
): AiDigestControllerMessenger {
  const messenger: AiDigestControllerMessenger = new Messenger({
    namespace: 'AiDigestController',
    parent: rootMessenger,
  });
  return messenger;
}
