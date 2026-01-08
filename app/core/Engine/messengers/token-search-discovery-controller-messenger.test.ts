import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { TokenSearchDiscoveryControllerMessenger } from '@metamask/token-search-discovery-controller';
import { getTokenSearchDiscoveryControllerMessenger } from './token-search-discovery-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<TokenSearchDiscoveryControllerMessenger>,
  MessengerEvents<TokenSearchDiscoveryControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTokenSearchDiscoveryControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenSearchDiscoveryControllerMessenger =
      getTokenSearchDiscoveryControllerMessenger(messenger);

    expect(tokenSearchDiscoveryControllerMessenger).toBeInstanceOf(Messenger);
  });
});
