import Engine from '../../Engine';
import Logger from '../../../util/Logger';
import { hydrateSocialFollowing } from './social-controller-hydration';

jest.mock('../../Engine', () => ({
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

  it('calls updateFollowing without any options', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      following: [],
    });

    await hydrateSocialFollowing();

    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'SocialController:updateFollowing',
    );
  });

  it('logs and does not throw when updateFollowing fails', async () => {
    const err = new Error('network error');
    (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(err);

    await hydrateSocialFollowing();

    expect(Logger.error).toHaveBeenCalledWith(
      err,
      'hydrateSocialFollowing failed',
    );
  });
});
