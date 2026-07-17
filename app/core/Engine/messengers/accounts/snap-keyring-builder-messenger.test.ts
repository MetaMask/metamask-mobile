import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getLegacySnapKeyringBuilderMessenger,
  SnapKeyringBuilderMessenger,
} from './snap-keyring-builder-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapKeyringBuilderMessenger>,
  MessengerEvents<SnapKeyringBuilderMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({ namespace: MOCK_ANY_NAMESPACE });
}

describe('getLegacySnapKeyringBuilderMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const messenger = getLegacySnapKeyringBuilderMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
