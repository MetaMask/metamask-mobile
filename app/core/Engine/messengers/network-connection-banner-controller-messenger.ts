import { Messenger } from '@metamask/messenger';
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
  return new Messenger({
    namespace: 'NetworkConnectionBannerController',
    parent: rootMessenger,
  });
}
