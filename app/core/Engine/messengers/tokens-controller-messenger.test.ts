import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { TokensControllerMessenger } from '@metamask/assets-controllers';
import {
  getTokensControllerMessenger,
  getTokensControllerInitMessenger,
  TokensControllerInitMessenger,
} from './tokens-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<TokensControllerMessenger>
  | MessengerActions<TokensControllerInitMessenger>,
  | MessengerEvents<TokensControllerMessenger>
  | MessengerEvents<TokensControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTokensControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokensControllerMessenger = getTokensControllerMessenger(messenger);

    expect(tokensControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getTokensControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokensControllerInitMessenger =
      getTokensControllerInitMessenger(messenger);

    expect(tokensControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
