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
          'ProfileService:getProfile',
          'ProfileService:createProfile',
          'ProfileService:replaceProfile',
          'ProfileService:updateProfile',
          'ProfileService:deleteProfile',
          'ProfileService:checkUsernameAvailability',
          'ProfileService:getXAuthUrl',
          'ProfileService:connectX',
          'ProfileService:getXAccount',
          'ProfileService:disconnectX',
        ]),
      }),
    );
  });

  it('delegates every ProfileService action allowed by the controller messenger', () => {
    const rootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileControllerMessenger(rootMessenger);

    const { calls } = delegateSpy.mock;
    const delegatedActions = new Set(
      calls.flatMap(
        ([{ actions }]: [
          { actions?: readonly string[]; events?: readonly string[] },
        ]) => actions ?? [],
      ),
    );

    const controllerAllowedActions = [
      'ProfileService:createProfile',
      'ProfileService:replaceProfile',
      'ProfileService:updateProfile',
      'ProfileService:deleteProfile',
      'ProfileService:checkUsernameAvailability',
      'ProfileService:connectX',
      'ProfileService:getXAccount',
      'ProfileService:getXAuthUrl',
      'ProfileService:disconnectX',
      'ProfileService:getProfile',
    ];

    const missing = controllerAllowedActions.filter(
      (action) => !delegatedActions.has(action),
    );

    expect(missing).toStrictEqual([]);
  });
});
