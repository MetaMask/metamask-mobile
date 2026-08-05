import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getSnapKeyringV2BuilderMessenger,
  SnapKeyringV2BuilderMessenger,
} from './snap-keyring-v2-builder-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapKeyringV2BuilderMessenger>,
  MessengerEvents<SnapKeyringV2BuilderMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapKeyringV2BuilderMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const messenger = getSnapKeyringV2BuilderMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
