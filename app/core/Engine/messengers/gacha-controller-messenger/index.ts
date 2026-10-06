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
 * Messenger of the GachaController. Only the Solana Snap request is
 * delegated to let Gacha forward provider signing requests.
 *
 * @param rootMessenger - The root messenger.
 * @returns The GachaController messenger.
 */
export function getGachaControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<GachaControllerMessenger>,
    MessengerEvents<GachaControllerMessenger>
  >,
): GachaControllerMessenger {
  const messenger: GachaControllerMessenger = new Messenger({
    namespace: GACHA_CONTROLLER_NAME,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['SnapController:handleRequest'],
    events: [],
    messenger,
  });
  return messenger;
}
