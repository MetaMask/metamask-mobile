import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { NetworkConnectionBannerControllerMessenger } from '@metamask/network-connection-banner-controller';
import { getNetworkConnectionBannerControllerMessenger } from './network-connection-banner-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NetworkConnectionBannerControllerMessenger>,
  MessengerEvents<NetworkConnectionBannerControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getNetworkConnectionBannerControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const networkConnectionBannerControllerMessenger =
      getNetworkConnectionBannerControllerMessenger(rootMessenger);

    expect(networkConnectionBannerControllerMessenger).toBeInstanceOf(
      Messenger,
    );
  });
});
