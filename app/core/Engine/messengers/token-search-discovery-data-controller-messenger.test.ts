import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { TokenSearchDiscoveryDataControllerMessenger } from '@metamask/assets-controllers';
import { getTokenSearchDiscoveryDataControllerMessenger } from './token-search-discovery-data-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<TokenSearchDiscoveryDataControllerMessenger>,
  MessengerEvents<TokenSearchDiscoveryDataControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getTokenSearchDiscoveryDataControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenSearchDiscoveryDataControllerMessenger =
      getTokenSearchDiscoveryDataControllerMessenger(messenger);

    expect(tokenSearchDiscoveryDataControllerMessenger).toBeInstanceOf(
      Messenger,
    );
  });
});
