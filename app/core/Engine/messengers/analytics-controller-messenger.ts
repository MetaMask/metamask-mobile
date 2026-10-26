import { Messenger } from '@metamask/messenger';
import type { AccountsControllerChangeEvent } from '@metamask/accounts-controller';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../types';

export type AnalyticsControllerInitMessenger = Messenger<
  'AnalyticsControllerInit',
  RemoteFeatureFlagControllerGetStateAction,
  AccountsControllerChangeEvent | RemoteFeatureFlagControllerStateChangeEvent
>;

/**
 * Get the init messenger for the AnalyticsController.
 * Scoped to analytics-init dependencies: accounts state changes for account
 * composition traits, and remote feature flags for the Braze event blocklist.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AnalyticsControllerInitMessenger.
 */
export function getAnalyticsControllerInitMessenger(
  rootMessenger: RootMessenger,
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
