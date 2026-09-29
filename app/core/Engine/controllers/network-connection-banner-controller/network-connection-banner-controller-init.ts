import {
  NetworkConnectionBannerController,
  type NetworkConnectionBannerControllerMessenger,
} from '@metamask/network-connection-banner-controller';

import { MessengerClientInitFunction } from '../../types';
import { INFURA_PROJECT_ID } from '../../../../constants/network';

/**
 * Initialize the NetworkConnectionBannerController.
 *
 * Encapsulates the show/hide rule and 5s/30s timer state machine for the
 * "Still connecting" / "Unable to connect" banner. Manages its own lifecycle
 * from ClientController and KeyringController events and subscribes to
 * NetworkController, NetworkEnablementController, and ConnectivityController
 * state via the messenger.
 *
 * @param request - The controller init request.
 * @param request.controllerMessenger - The messenger for the controller.
 * @returns The controller init result.
 */
export const networkConnectionBannerControllerInit: MessengerClientInitFunction<
  NetworkConnectionBannerController,
  NetworkConnectionBannerControllerMessenger
> = ({ controllerMessenger }) => {
  const controller = new NetworkConnectionBannerController({
    messenger: controllerMessenger,
    infuraProjectId: INFURA_PROJECT_ID as string,
  });

  return {
    controller,
  };
};
