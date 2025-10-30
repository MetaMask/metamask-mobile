import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { UserStorageControllerMessenger } from '@metamask/profile-sync-controller/user-storage';
import { getUserStorageControllerMessenger } from './user-storage-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<UserStorageControllerMessenger>,
  MessengerEvents<UserStorageControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getUserStorageControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const userStorageControllerMessenger =
      getUserStorageControllerMessenger(rootMessenger);

    expect(userStorageControllerMessenger).toBeInstanceOf(Messenger);
  });
});
