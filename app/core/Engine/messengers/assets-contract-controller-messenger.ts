import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

import { RootMessenger } from '../types';
import { AssetsContractControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the AssetsContractControllerMessenger for the AssetsContractController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AssetsContractControllerMessenger.
 */
export function getAssetsContractControllerMessenger(
  rootMessenger: RootMessenger,
): AssetsContractControllerMessenger {
  const messenger = new Messenger<
    'AssetsContractController',
    MessengerActions<AssetsContractControllerMessenger>,
    MessengerEvents<AssetsContractControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AssetsContractController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkConfigurationByNetworkClientId',
      'NetworkController:getSelectedNetworkClient',
      'NetworkController:getState',
    ],
    events: [
      'NetworkController:networkDidChange',
      'PreferencesController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
