import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { TokenListControllerMessenger } from '@metamask/assets-controllers';
import {
  getTokenListControllerMessenger,
  getTokenListControllerInitMessenger,
  TokenListControllerInitMessenger,
} from './token-list-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<TokenListControllerMessenger>
  | MessengerActions<TokenListControllerInitMessenger>,
  | MessengerEvents<TokenListControllerMessenger>
  | MessengerEvents<TokenListControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getTokenListControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenListControllerMessenger =
      getTokenListControllerMessenger(messenger);

    expect(tokenListControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getTokenListControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenListControllerInitMessenger =
      getTokenListControllerInitMessenger(messenger);

    expect(tokenListControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
