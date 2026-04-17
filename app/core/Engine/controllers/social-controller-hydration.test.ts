import Engine from '../../Engine';
import Logger from '../../../util/Logger';
import { hydrateSocialFollowing } from './social-controller-hydration';

jest.mock('../../Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest.fn(),
    },
  },
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('hydrateSocialFollowing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls updateFollowing with the user profileId', async () => {
    (
      Engine.context.AuthenticationController.getSessionProfile as jest.Mock
    ).mockResolvedValue({ profileId: 'user-123' });
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      following: [],
    });

    await hydrateSocialFollowing();

    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'SocialController:updateFollowing',
      { addressOrUid: 'user-123' },
    );
  });

  it('logs and does not throw when getSessionProfile fails', async () => {
    const err = new Error('not authenticated');
    (
      Engine.context.AuthenticationController.getSessionProfile as jest.Mock
    ).mockRejectedValue(err);

    await hydrateSocialFollowing();

    expect(Logger.error).toHaveBeenCalledWith(
      err,
      'hydrateSocialFollowing failed',
    );
  });

  it('logs and does not throw when updateFollowing fails', async () => {
    (
      Engine.context.AuthenticationController.getSessionProfile as jest.Mock
    ).mockResolvedValue({ profileId: 'user-123' });
    const err = new Error('network error');
    (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(err);

    await hydrateSocialFollowing();

    expect(Logger.error).toHaveBeenCalledWith(
      err,
      'hydrateSocialFollowing failed',
    );
  });
});
