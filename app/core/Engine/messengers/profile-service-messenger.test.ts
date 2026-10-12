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
    const rootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    }) as RootMessenger;

    const profileServiceMessenger = getProfileServiceMessenger(rootMessenger);

    expect(profileServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates bearer token access to the messenger', () => {
    const rootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    }) as RootMessenger;
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: ['AuthenticationController:getBearerToken'],
      }),
    );
  });
});
