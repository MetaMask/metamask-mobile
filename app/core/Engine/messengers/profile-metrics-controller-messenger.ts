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
 * profile metrics controller.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileMetricsControllerMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): ProfileMetricsControllerMessenger {
  const profileMetricsControllerMessenger: ProfileMetricsControllerMessenger =
    new Messenger({
      namespace: 'ProfileMetricsController',
      parent: rootMessenger,
    });
  rootMessenger.delegate({
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
      'TransactionController:transactionSubmitted',
    ],
  });
  return profileMetricsControllerMessenger;
}

export type ProfileMetricsControllerInitMessenger = Messenger<
  'ProfileMetricsControllerInit',
  ProfileMetricsControllerInitMessengerActions,
  never
>;

/**
 * Create a messenger for ProfileMetricsController initialization.
 * This messenger provides access to AnalyticsController state.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileMetricsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<ProfileMetricsControllerInitMessenger>,
    MessengerEvents<ProfileMetricsControllerInitMessenger>
  >,
): ProfileMetricsControllerInitMessenger {
  const initMessenger: ProfileMetricsControllerInitMessenger = new Messenger({
    namespace: 'ProfileMetricsControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AnalyticsController:getState'],
    messenger: initMessenger,
  });
  return initMessenger;
}
