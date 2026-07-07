import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getClientControllerMessenger } from './client-controller-messenger';
import { ClientControllerMessenger } from '@metamask/client-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ClientControllerMessenger>,
  MessengerEvents<ClientControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getClientControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const clientControllerMessenger =
      getClientControllerMessenger(rootMessenger);

    expect(clientControllerMessenger).toBeInstanceOf(Messenger);
  });
});
