import { AnalyticsControllerMessenger } from '@metamask/analytics-controller';
import {
  Messenger,
  MessengerEvents,
  MessengerActions,
} from '@metamask/messenger';
import type { AccountsControllerChangeEvent } from '@metamask/accounts-controller';
import { RootMessenger } from '../types';

/**
 * Get the AnalyticsControllerMessenger for the AnalyticsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AnalyticsControllerMessenger.
 */
export function getAnalyticsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AnalyticsControllerMessenger>,
    MessengerEvents<AnalyticsControllerMessenger>
  >,
): AnalyticsControllerMessenger {
  const messenger: AnalyticsControllerMessenger = new Messenger({
    namespace: 'AnalyticsController',
    parent: rootMessenger,
  });
  return messenger;
}

export type AnalyticsControllerInitMessenger = Messenger<
  'AnalyticsControllerInit',
  never,
  AccountsControllerChangeEvent
>;

/**
 * Get the init messenger for the AnalyticsController.
 * Scoped to analytics-init dependencies like accounts state changes for
 * account composition trait updates.
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
    actions: [],
    events: ['AccountsController:stateChange'],
    messenger,
  });

  return messenger;
}
