import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';

import {
  GACHA_CONTROLLER_NAME,
  type GachaControllerMessenger,
} from '../../../../components/UI/Gacha/controllers/GachaController';
import type { RootMessenger } from '../../types';

/**
 * Connects Gacha to Engine without granting external controller access.
 *
 * @param rootMessenger - The Engine messenger.
 * @returns The Gacha controller messenger.
 */
export function getGachaControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<GachaControllerMessenger>,
    MessengerEvents<GachaControllerMessenger>
  >,
): GachaControllerMessenger {
  return new Messenger({
    namespace: GACHA_CONTROLLER_NAME,
    parent: rootMessenger,
  });
}
