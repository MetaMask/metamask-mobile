import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getSnapControllerInitMessenger,
  getSnapControllerMessenger,
  SnapControllerMessenger,
} from './snap-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapControllerMessenger>,
  MessengerEvents<SnapControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const snapControllerMessenger = getSnapControllerMessenger(rootMessenger);

    expect(snapControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getSnapControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const snapControllerInitMessenger =
      getSnapControllerInitMessenger(rootMessenger);

    expect(snapControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
