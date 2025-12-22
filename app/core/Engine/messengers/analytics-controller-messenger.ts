import { AnalyticsControllerMessenger } from '@metamask/analytics-controller';
import {
  Messenger,
  MessengerEvents,
  MessengerActions,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

/**
 * Get the AnalyticsControllerMessenger for the AnalyticsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AnalyticsControllerMessenger.
 */
export function getAnalyticsControllerMessenger(
  rootMessenger: RootMessenger,
): AnalyticsControllerMessenger {
  const messenger = new Messenger<
    'AnalyticsController',
    MessengerActions<AnalyticsControllerMessenger>,
    MessengerEvents<AnalyticsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AnalyticsController',
    parent: rootMessenger,
  });
  return messenger;
}
