import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { getProfileControllerMessenger } from './profile-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const profileControllerMessenger = getProfileControllerMessenger(messenger);

    expect(profileControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates required actions to the messenger', () => {
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
          'ProfileService:getXAccount',
        ]),
      }),
    );
  });
});
