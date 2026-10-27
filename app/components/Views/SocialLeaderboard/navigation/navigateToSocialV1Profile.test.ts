import Routes from '../../../../constants/navigation/Routes';
import { navigateToSocialV1Profile } from './navigateToSocialV1Profile';

import { ensureSocialTermsAccepted } from '../terms/socialTermsAcceptance';

jest.mock('../terms/socialTermsAcceptance', () => ({
  ensureSocialTermsAccepted: jest.fn(() => true),
}));

const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate };

describe('navigateToSocialV1Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(true);
  });

  it('does not open the profile when the Social terms are not accepted', () => {
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(false);

    navigateToSocialV1Profile(navigation, { traderId: 'trader-1' });

    expect(ensureSocialTermsAccepted).toHaveBeenCalledWith(mockNavigate);
    expect(mockNavigate).not.toHaveBeenCalled();
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
      traderAvatarUri: 'https://example.com/a.png',
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
        traderAvatarUri: 'https://example.com/a.png',
        source: 'leaderboard',
        traderRank: 4,
      },
      {},
    );
  });
});
