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
  // The preview package's messenger type is built against the new
  // `:stateChanged` event-name flavor (`ControllerStateChangedEvent`), while
  // mobile's `GlobalEvents` union still aggregates each peer controller's
  // legacy `:stateChange` flavor. `BaseController` publishes both names at
  // runtime, so the wiring works — only the type union is skewed. The cast
  // can be dropped once `GlobalEvents` is updated to include the
  // `:stateChanged` aliases for the relevant peer controllers.
  return new Messenger({
    namespace: 'NetworkConnectionBannerController',
    parent: rootMessenger as unknown as undefined,
  }) as unknown as NetworkConnectionBannerControllerMessenger;
}
