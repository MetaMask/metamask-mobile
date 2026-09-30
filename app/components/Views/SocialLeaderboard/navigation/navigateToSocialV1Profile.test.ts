import Routes from '../../../../constants/navigation/Routes';
import { navigateToSocialV1Profile } from './navigateToSocialV1Profile';

const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate };

describe('navigateToSocialV1Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the V1 profile without params for the signed-in viewer', () => {
    navigateToSocialV1Profile(navigation, {
      traderId: 'current-user',
      traderName: 'me',
      viewerProfileId: 'current-user',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      undefined,
      {},
    );
  });

  it('opens the V1 profile without params when traderId is omitted', () => {
    navigateToSocialV1Profile(navigation);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      undefined,
      {},
    );
  });

  it('passes identity params for another trader', () => {
    navigateToSocialV1Profile(navigation, {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0x1',
      source: 'leaderboard',
      traderRank: 4,
      viewerProfileId: 'current-user',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: 'trader-1',
        traderName: 'alpha.eth',
        traderAddress: '0x1',
        source: 'leaderboard',
        traderRank: 4,
      },
      {},
    );
  });
});
