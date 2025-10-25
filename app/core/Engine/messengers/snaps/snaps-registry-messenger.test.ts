import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { SnapsRegistryMessenger } from '@metamask/snaps-controllers';
import { getSnapsRegistryMessenger } from './snaps-registry-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapsRegistryMessenger>,
  MessengerEvents<SnapsRegistryMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapsRegistryMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const snapsRegistryMessenger = getSnapsRegistryMessenger(rootMessenger);

    expect(snapsRegistryMessenger).toBeInstanceOf(Messenger);
  });
});
