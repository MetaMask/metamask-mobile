import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getSelectedNetworkControllerMessenger } from './selected-network-controller-messenger';
import { SelectedNetworkControllerMessenger } from '@metamask/selected-network-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SelectedNetworkControllerMessenger>,
  MessengerEvents<SelectedNetworkControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSelectedNetworkControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const selectedNetworkControllerMessenger =
      getSelectedNetworkControllerMessenger(messenger);

    expect(selectedNetworkControllerMessenger).toBeInstanceOf(Messenger);
  });
});
