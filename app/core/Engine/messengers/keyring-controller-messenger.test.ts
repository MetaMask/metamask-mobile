import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getKeyringControllerMessenger } from './keyring-controller-messenger';
import { KeyringControllerMessenger } from '@metamask/keyring-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<KeyringControllerMessenger>,
  MessengerEvents<KeyringControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}
describe('getKeyringControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const keyringControllerMessenger =
      getKeyringControllerMessenger(rootMessenger);

    expect(keyringControllerMessenger).toBeInstanceOf(Messenger);
  });
});
