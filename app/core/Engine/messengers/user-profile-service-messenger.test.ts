import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { getUserProfileServiceMessenger } from './user-profile-service-messenger';
import { UserProfileServiceMessenger } from '@metamask/user-profile-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<UserProfileServiceMessenger>,
  MessengerEvents<UserProfileServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getUserProfileServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const userProfileServiceMessenger =
      getUserProfileServiceMessenger(messenger);

    expect(userProfileServiceMessenger).toBeInstanceOf(Messenger);
  });
});
