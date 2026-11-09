import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { AccountsControllerChangeEvent } from '@metamask/accounts-controller';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import type { RootMessenger } from '../../types';

export type AnalyticsControllerInitMessenger = Messenger<
  'AnalyticsControllerInit',
  RemoteFeatureFlagControllerGetStateAction,
  AccountsControllerChangeEvent | RemoteFeatureFlagControllerStateChangeEvent
>;

/**
 * Get the init messenger for the wallet-owned AnalyticsController.
 * Scoped to the mobile wiring that runs after the wallet is constructed:
 * accounts state changes for account composition traits, and remote feature
 * flags for the Braze event blocklist.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AnalyticsControllerInitMessenger.
 */
export function getAnalyticsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AnalyticsControllerInitMessenger>,
    MessengerEvents<AnalyticsControllerInitMessenger>
  >,
): AnalyticsControllerInitMessenger {
  const messenger: AnalyticsControllerInitMessenger = new Messenger({
    namespace: 'AnalyticsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: [
      'AccountsController:stateChange',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });

  return messenger;
}
