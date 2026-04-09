import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { SnapRegistryControllerMessenger } from '@metamask/snaps-controllers';
import { getSnapRegistryControllerMessenger } from './snap-registry-controller-messenger.ts';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapRegistryControllerMessenger>,
  MessengerEvents<SnapRegistryControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapRegistryControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const messenger = getSnapRegistryControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
