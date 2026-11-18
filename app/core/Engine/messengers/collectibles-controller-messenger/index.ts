import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';

import {
  COLLECTIBLES_CONTROLLER_NAME,
  type CollectiblesControllerMessenger,
} from '../../../../components/UI/Collectibles/controllers/CollectiblesController';
import type { RootMessenger } from '../../types';

/**
 * Messenger of the CollectiblesController. The Solana Snap request signs
 * purchases and buybacks; the data-service invalidation refreshes the reads a
 * terminal outcome changed; the unlock event resumes interrupted operations.
 *
 * @param rootMessenger - The root messenger.
 * @returns The CollectiblesController messenger.
 */
export function getCollectiblesControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<CollectiblesControllerMessenger>,
    MessengerEvents<CollectiblesControllerMessenger>
  >,
): CollectiblesControllerMessenger {
  const messenger: CollectiblesControllerMessenger = new Messenger({
    namespace: COLLECTIBLES_CONTROLLER_NAME,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'SnapController:handleRequest',
      'PackPartnerDataService:invalidateQueries',
    ],
    events: ['KeyringController:unlock'],
    messenger,
  });
  return messenger;
}
