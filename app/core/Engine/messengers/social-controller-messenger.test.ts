import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getSocialControllerMessenger } from './social-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSocialControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const socialControllerMessenger =
      getSocialControllerMessenger(rootMessenger);

    expect(socialControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates SocialService actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSocialControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'SocialService:fetchLeaderboard',
          'SocialService:follow',
          'SocialService:unfollow',
          'SocialService:fetchFollowing',
        ]),
      }),
    );
  });
});
