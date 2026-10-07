import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { ProfileServiceMessenger } from '@metamask/profile-controller';
import { getProfileServiceMessenger } from './profile-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProfileServiceMessenger>,
  MessengerEvents<ProfileServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getProfileServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const profileServiceMessenger = getProfileServiceMessenger(rootMessenger);

    expect(profileServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates the AuthenticationController bearer token action', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: ['AuthenticationController:getBearerToken'],
      }),
    );
  });
});
