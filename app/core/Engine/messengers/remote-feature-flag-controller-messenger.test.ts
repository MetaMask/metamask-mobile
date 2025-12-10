import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getRemoteFeatureFlagControllerMessenger } from './remote-feature-flag-controller-messenger';
import { RemoteFeatureFlagControllerMessenger } from '@metamask/remote-feature-flag-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RemoteFeatureFlagControllerMessenger>,
  MessengerEvents<RemoteFeatureFlagControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRemoteFeatureFlagControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const remoteFeatureFlagControllerMessenger =
      getRemoteFeatureFlagControllerMessenger(rootMessenger);

    expect(remoteFeatureFlagControllerMessenger).toBeInstanceOf(Messenger);
  });
});
