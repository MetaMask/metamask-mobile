import { ProfileMetricsControllerMessenger } from '@metamask/profile-metrics-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AnalyticsControllerGetStateAction } from '@metamask/analytics-controller';
import { RootMessenger } from '../types';

type AllowedActions = MessengerActions<ProfileMetricsControllerMessenger>;

type AllowedEvents = MessengerEvents<ProfileMetricsControllerMessenger>;

type ProfileMetricsControllerInitMessengerActions =
  AnalyticsControllerGetStateAction;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * accounts controller.
 *
 * @param messenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileMetricsControllerMessenger(messenger: RootMessenger) {
  const profileMetricsControllerMessenger = new Messenger<
    'ProfileMetricsController',
    AllowedActions,
    AllowedEvents,
    typeof messenger
  >({
    namespace: 'ProfileMetricsController',
    parent: messenger,
  });
  messenger.delegate({
    messenger: profileMetricsControllerMessenger,
    actions: [
      'AccountsController:getState',
      'ProfileMetricsService:submitMetrics',
    ],
    events: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'KeyringController:lock',
      'KeyringController:unlock',
    ],
  });
  return profileMetricsControllerMessenger;
}

export type ProfileMetricsControllerInitMessenger = ReturnType<
  typeof getProfileMetricsControllerInitMessenger
>;

/**
 * Create a messenger for ProfileMetricsController initialization.
 * This messenger provides access to AnalyticsController state.
 *
 * @param messenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileMetricsControllerInitMessenger(
  messenger: RootMessenger,
) {
  const initMessenger = new Messenger<
    'ProfileMetricsControllerInit',
    ProfileMetricsControllerInitMessengerActions,
    never,
    RootMessenger
  >({
    namespace: 'ProfileMetricsControllerInit',
    parent: messenger,
  });
  messenger.delegate({
    actions: ['AnalyticsController:getState'],
    messenger: initMessenger,
  });
  return initMessenger;
}
