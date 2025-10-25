import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getMultichainRouterMessenger,
  getMultichainRouterInitMessenger,
  MultichainRouterInitMessenger,
} from './multichain-router-messenger';
import { MultichainRouterMessenger } from '@metamask/snaps-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MultichainRouterMessenger>
  | MessengerActions<MultichainRouterInitMessenger>,
  | MessengerEvents<MultichainRouterMessenger>
  | MessengerEvents<MultichainRouterInitMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMultichainRouterMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const multichainRouterMessenger =
      getMultichainRouterMessenger(rootMessenger);

    expect(multichainRouterMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getMultichainRouterInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const multichainRouterInitMessenger =
      getMultichainRouterInitMessenger(rootMessenger);

    expect(multichainRouterInitMessenger).toBeInstanceOf(Messenger);
  });
});
