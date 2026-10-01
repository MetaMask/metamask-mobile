import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { ProfileServiceMessenger } from '@metamask/profile-controller';
import { getProfileServiceMessenger } from './profile-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProfileServiceMessenger>,
  MessengerEvents<ProfileServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const profileServiceMessenger = getProfileServiceMessenger(messenger);

    expect(profileServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates required actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AuthenticationController:getBearerToken',
        ]),
      }),
    );
  });
});
