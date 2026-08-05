import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { NetworkConnectionBannerControllerMessenger } from '@metamask/network-connection-banner-controller';
import { RootMessenger } from '../types';

/**
 * Get the NetworkConnectionBannerControllerMessenger for the
 * NetworkConnectionBannerController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NetworkConnectionBannerControllerMessenger.
 */
export function getNetworkConnectionBannerControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NetworkConnectionBannerControllerMessenger>,
    // @ts-expect-error ClientController:stateChanged is not yet on GlobalEvents
    MessengerEvents<NetworkConnectionBannerControllerMessenger>
  >,
): NetworkConnectionBannerControllerMessenger {
  const messenger: NetworkConnectionBannerControllerMessenger = new Messenger({
    namespace: 'NetworkConnectionBannerController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'NetworkController:getState',
      'NetworkController:getNetworkConfigurationByChainId',
      'NetworkController:updateNetwork',
      'NetworkController:setActiveNetwork',
      'NetworkEnablementController:getState',
      'ConnectivityController:getState',
    ],
    events: [
      'NetworkController:stateChange',
      'NetworkEnablementController:stateChange',
      'ConnectivityController:stateChange',
      'ClientController:stateChanged',
      'KeyringController:unlock',
      'KeyringController:lock',
    ],
    messenger,
  });

  return messenger;
}
