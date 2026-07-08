import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { RemoteFeatureFlagControllerMessenger } from '@metamask/remote-feature-flag-controller';

export function getRemoteFeatureFlagControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<RemoteFeatureFlagControllerMessenger>,
    MessengerEvents<RemoteFeatureFlagControllerMessenger>
  >,
): RemoteFeatureFlagControllerMessenger {
  const messenger: RemoteFeatureFlagControllerMessenger = new Messenger({
    namespace: 'RemoteFeatureFlagController',
    parent: rootMessenger,
  });
  return messenger;
}
