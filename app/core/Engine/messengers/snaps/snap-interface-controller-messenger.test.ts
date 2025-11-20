import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getSnapInterfaceControllerMessenger } from './snap-interface-controller-messenger';
import { SnapInterfaceControllerMessenger } from '@metamask/snaps-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapInterfaceControllerMessenger>,
  MessengerEvents<SnapInterfaceControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapInterfaceControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const snapInterfaceControllerMessenger =
      getSnapInterfaceControllerMessenger(rootMessenger);

    expect(snapInterfaceControllerMessenger).toBeInstanceOf(Messenger);
  });
});
