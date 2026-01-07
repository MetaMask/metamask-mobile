import type { GasFeeMessenger } from '@metamask/gas-fee-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

const name = 'GasFeeController';

export function getGasFeeControllerMessenger(
  rootMessenger: RootMessenger,
): GasFeeMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<GasFeeMessenger>,
    MessengerEvents<GasFeeMessenger>,
    RootMessenger
  >({
    namespace: name,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getEIP1559Compatibility',
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
    ],
    events: ['NetworkController:networkDidChange'],
    messenger,
  });
  return messenger;
}
