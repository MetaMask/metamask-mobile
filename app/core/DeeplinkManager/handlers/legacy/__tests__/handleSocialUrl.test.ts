import { handleSocialLeaderboardUrl } from '../handleSocialLeaderboardUrl';
import { handleSocialTraderPositionUrl } from '../handleSocialTraderPositionUrl';
import { handleSocialTraderUrl } from '../handleSocialTraderUrl';
import { handleSocialUrl } from '../handleSocialUrl';

jest.mock('../handleSocialLeaderboardUrl', () => ({
  handleSocialLeaderboardUrl: jest.fn(),
}));

jest.mock('../handleSocialTraderUrl', () => ({
  handleSocialTraderUrl: jest.fn(),
}));

jest.mock('../handleSocialTraderPositionUrl', () => ({
  handleSocialTraderPositionUrl: jest.fn(),
}));

describe('handleSocialUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens social home for /social', () => {
    const actionPath = '?tab=trending';

    handleSocialUrl({ actionPath });

    expect(handleSocialLeaderboardUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialTraderUrl).not.toHaveBeenCalled();
    expect(handleSocialTraderPositionUrl).not.toHaveBeenCalled();
  });

  it('opens a trader profile for /social/trader', () => {
    const actionPath = '/trader?traderId=trader-1';

    handleSocialUrl({ actionPath });

    expect(handleSocialTraderUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialLeaderboardUrl).not.toHaveBeenCalled();
  });

  it('opens a trader position for /social/trader/position', () => {
    const actionPath =
      '/trader/position?positionId=position-1&traderId=trader-1';

    handleSocialUrl({ actionPath });

    expect(handleSocialTraderPositionUrl).toHaveBeenCalledWith({ actionPath });
    expect(handleSocialTraderUrl).not.toHaveBeenCalled();
  });
});
