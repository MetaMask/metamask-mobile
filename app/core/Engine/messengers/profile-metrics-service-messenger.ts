import { ProfileMetricsServiceMessenger } from '@metamask/profile-metrics-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

type AllowedActions = MessengerActions<ProfileMetricsServiceMessenger>;

type AllowedEvents = MessengerEvents<ProfileMetricsServiceMessenger>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * profile metrics service.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileMetricsServiceMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): ProfileMetricsServiceMessenger {
  const serviceMessenger: ProfileMetricsServiceMessenger = new Messenger({
    namespace: 'ProfileMetricsService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return serviceMessenger;
}
