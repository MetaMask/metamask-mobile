import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { RemoteFeatureFlagControllerMessenger } from '@metamask/remote-feature-flag-controller';

export function getRemoteFeatureFlagControllerMessenger(
  rootMessenger: RootMessenger,
): RemoteFeatureFlagControllerMessenger {
  const messenger = new Messenger<
    'RemoteFeatureFlagController',
    MessengerActions<RemoteFeatureFlagControllerMessenger>,
    MessengerEvents<RemoteFeatureFlagControllerMessenger>,
    RootMessenger
  >({
    namespace: 'RemoteFeatureFlagController',
    parent: rootMessenger,
  });
  return messenger;
}
