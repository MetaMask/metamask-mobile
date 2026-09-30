import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { ProfileServiceMessenger } from '@metamask/profile-controller';
import { getProfileServiceMessenger } from './profile-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProfileServiceMessenger>,
  MessengerEvents<ProfileServiceMessenger>
>;

describe('getProfileServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });

    expect(getProfileServiceMessenger(rootMessenger)).toBeInstanceOf(Messenger);
  });
});
