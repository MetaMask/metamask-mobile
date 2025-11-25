import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { getUserProfileControllerMessenger } from './user-profile-controller-messenger';
import { UserProfileControllerMessenger } from '@metamask/user-profile-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<UserProfileControllerMessenger>,
  MessengerEvents<UserProfileControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getUserProfileControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const userProfileControllerMessenger =
      getUserProfileControllerMessenger(messenger);

    expect(userProfileControllerMessenger).toBeInstanceOf(Messenger);
  });
});
