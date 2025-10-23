import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { TokenBalancesControllerMessenger } from '@metamask/assets-controllers';
import {
  getTokenBalancesControllerMessenger,
  getTokenBalancesControllerInitMessenger,
  TokenBalancesControllerInitMessenger,
} from './token-balances-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<TokenBalancesControllerMessenger>
  | MessengerActions<TokenBalancesControllerInitMessenger>,
  | MessengerEvents<TokenBalancesControllerMessenger>
  | MessengerEvents<TokenBalancesControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTokenBalancesControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenBalancesControllerMessenger =
      getTokenBalancesControllerMessenger(messenger);

    expect(tokenBalancesControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getTokenBalancesControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenBalancesControllerInitMessenger =
      getTokenBalancesControllerInitMessenger(messenger);

    expect(tokenBalancesControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
