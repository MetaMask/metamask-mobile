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
  rootMessenger: RootMessenger,
): NetworkConnectionBannerControllerMessenger {
  const messenger = new Messenger<
    'NetworkConnectionBannerController',
    MessengerActions<NetworkConnectionBannerControllerMessenger>,
    MessengerEvents<NetworkConnectionBannerControllerMessenger>,
    RootMessenger
  >({
    namespace: 'NetworkConnectionBannerController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'NetworkController:getState',
      'NetworkController:getNetworkConfigurationByChainId',
      'NetworkController:updateNetwork',
      'NetworkEnablementController:getState',
      'ConnectivityController:getState',
    ],
    events: [
      'NetworkController:stateChange',
      'NetworkEnablementController:stateChange',
      'ConnectivityController:stateChange',
    ],
    messenger,
  });

  return messenger;
}
