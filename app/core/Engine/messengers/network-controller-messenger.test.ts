import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getNetworkControllerMessenger,
  getNetworkControllerInitMessenger,
  NetworkControllerInitMessenger,
} from './network-controller-messenger';
import { NetworkControllerMessenger } from '@metamask/network-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<NetworkControllerMessenger>
  | MessengerActions<NetworkControllerInitMessenger>,
  | MessengerEvents<NetworkControllerMessenger>
  | MessengerEvents<NetworkControllerInitMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getNetworkControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const networkControllerMessenger =
      getNetworkControllerMessenger(rootMessenger);

    expect(networkControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getNetworkControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const networkControllerInitMessenger =
      getNetworkControllerInitMessenger(rootMessenger);

    expect(networkControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
