import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getProfileControllerMessenger } from './profile-controller-messenger';

describe('getProfileControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });

    const profileControllerMessenger =
      getProfileControllerMessenger(rootMessenger);

    expect(profileControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates ProfileService actions to the messenger', () => {
    const rootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'ProfileService:updateProfile',
          'ProfileService:checkUsernameAvailability',
        ]),
      }),
    );
  });
});
