import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getProfileControllerMessenger } from './profile-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const profileControllerMessenger =
      getProfileControllerMessenger(rootMessenger);

    expect(profileControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates ProfileService actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'ProfileService:createProfile',
          'ProfileService:replaceProfile',
          'ProfileService:updateProfile',
          'ProfileService:deleteProfile',
          'ProfileService:checkUsernameAvailability',
          'ProfileService:connectX',
          'ProfileService:getProfile',
          'ProfileService:getXAccount',
          'ProfileService:getXAuthUrl',
          'ProfileService:disconnectX',
        ]),
      }),
    );
  });
});
