import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { navigateToSocialLeaderboard } from '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import { usePerpsSocialEnabled } from '../../hooks/usePerpsSocialEnabled';
import PerpsSocialFeedSection from './PerpsSocialFeedSection';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock(
  '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({ navigateToSocialLeaderboard: jest.fn() }),
);

jest.mock('../../hooks/usePerpsSocialEnabled', () => ({
  usePerpsSocialEnabled: jest.fn(),
}));

jest.mock('./PerpsSocialTrending', () => () => null);

jest.mock('./PerpsSocialTopTraders', () => () => null);

const mockNavigateToSocialLeaderboard = jest.mocked(
  navigateToSocialLeaderboard,
);
const mockUsePerpsSocialEnabled = jest.mocked(usePerpsSocialEnabled);

describe('PerpsSocialFeedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsSocialEnabled.mockReturnValue(true);
  });

  it('renders nothing when Perps social is off', () => {
    mockUsePerpsSocialEnabled.mockReturnValue(false);

    renderWithProvider(<PerpsSocialFeedSection />);

    expect(
      screen.queryByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SECTION),
    ).toBeNull();
  });

  it('opens Social on Trending from the header while Trending is selected', () => {
    renderWithProvider(<PerpsSocialFeedSection />);

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_HEADER),
    );

    expect(mockNavigateToSocialLeaderboard).toHaveBeenCalledTimes(1);
    expect(mockNavigateToSocialLeaderboard).toHaveBeenCalledWith(mockNavigate, {
      source: 'perps_home',
      initialTab: 'trending',
    });
  });

  it('opens Social on Leaderboard from the header while Top traders is selected', () => {
    renderWithProvider(<PerpsSocialFeedSection />);
    fireEvent.press(
      screen.getByTestId(
        PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TOP_TRADERS_PILL,
      ),
    );

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_HEADER),
    );

    expect(mockNavigateToSocialLeaderboard).toHaveBeenCalledTimes(1);
    expect(mockNavigateToSocialLeaderboard).toHaveBeenCalledWith(mockNavigate, {
      source: 'perps_home',
      initialTab: 'leaderboard',
    });
  });
});
