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
 * Connects Collectibles to Engine without granting external controller access.
 *
 * @param rootMessenger - The Engine messenger.
 * @returns The Collectibles controller messenger.
 */
export function getCollectiblesControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<CollectiblesControllerMessenger>,
    MessengerEvents<CollectiblesControllerMessenger>
  >,
): CollectiblesControllerMessenger {
  return new Messenger({
    namespace: COLLECTIBLES_CONTROLLER_NAME,
    parent: rootMessenger,
  });
}
