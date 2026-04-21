import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { AuthenticatedUserStorageMessenger } from '@metamask/authenticated-user-storage';
import { getAuthenticatedUserStorageServiceMessenger } from './authenticated-user-storage-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AuthenticatedUserStorageMessenger>,
  MessengerEvents<AuthenticatedUserStorageMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getAuthenticatedUserStorageServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger =
      getAuthenticatedUserStorageServiceMessenger(rootMessenger);

    expect(serviceMessenger).toBeInstanceOf(Messenger);
  });
});
