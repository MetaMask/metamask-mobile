import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { TokenRatesControllerMessenger } from '@metamask/assets-controllers';
import { getTokenRatesControllerMessenger } from './token-rates-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<TokenRatesControllerMessenger>,
  MessengerEvents<TokenRatesControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getTokenRatesControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenRatesControllerMessenger =
      getTokenRatesControllerMessenger(messenger);

    expect(tokenRatesControllerMessenger).toBeInstanceOf(Messenger);
  });
});
