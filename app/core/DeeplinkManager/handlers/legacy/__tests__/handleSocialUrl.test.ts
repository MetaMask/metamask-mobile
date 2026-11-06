import { handleSocialUrl } from '../handleSocialUrl';
import { handleSocialLeaderboardUrl } from '../handleSocialLeaderboardUrl';
import { handleSocialPostUrl } from '../handleSocialPostUrl';
import { handleSocialTraderPositionUrl } from '../handleSocialTraderPositionUrl';
import { handleSocialTraderUrl } from '../handleSocialTraderUrl';

jest.mock('../handleSocialLeaderboardUrl', () => ({
  handleSocialLeaderboardUrl: jest.fn(),
}));
jest.mock('../handleSocialPostUrl', () => ({
  handleSocialPostUrl: jest.fn(),
}));
jest.mock('../handleSocialTraderPositionUrl', () => ({
  handleSocialTraderPositionUrl: jest.fn(),
}));
jest.mock('../handleSocialTraderUrl', () => ({
  handleSocialTraderUrl: jest.fn(),
}));
jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({ log: jest.fn() }));

describe('handleSocialUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('routes /social/post to the post handler', () => {
    const actionPath = '/social/post?positionId=position-1&traderId=trader-1';

    handleSocialUrl({ actionPath });

    expect(handleSocialPostUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialTraderPositionUrl).not.toHaveBeenCalled();
    expect(handleSocialLeaderboardUrl).not.toHaveBeenCalled();
  });

  it('routes /social/profile/position to the position handler', () => {
    const actionPath =
      '/social/profile/position?positionId=position-1&traderId=trader-1';

    handleSocialUrl({ actionPath });

    expect(handleSocialTraderPositionUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialPostUrl).not.toHaveBeenCalled();
  });

  it('routes /social/profile to the trader handler', () => {
    const actionPath = '/social/profile?traderId=trader-1';

    handleSocialUrl({ actionPath });

    expect(handleSocialTraderUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialPostUrl).not.toHaveBeenCalled();
  });

  it('falls back to the leaderboard for an unrecognized subpath', () => {
    const actionPath = '/social/posts';

    handleSocialUrl({ actionPath });

    expect(handleSocialLeaderboardUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialPostUrl).not.toHaveBeenCalled();
  });
});
