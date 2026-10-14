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
  () => ({
    navigateToSocialLeaderboard: jest.fn(),
  }),
);

jest.mock('../../hooks/usePerpsSocialEnabled', () => ({
  usePerpsSocialEnabled: jest.fn(),
}));

jest.mock('./PerpsSocialTrending', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return () => ReactModule.createElement(View, { testID: 'mock-trending' });
});

jest.mock('./PerpsSocialTopTraders', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return ({ onSeeMorePress }: { onSeeMorePress: () => void }) =>
    ReactModule.createElement(Pressable, {
      testID: 'mock-top-traders',
      onPress: onSeeMorePress,
    });
});

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
    expect(screen.queryByTestId('mock-trending')).toBeNull();
  });

  it('renders the Social feed header and shows Trending by default', () => {
    renderWithProvider(<PerpsSocialFeedSection />);

    expect(screen.getByText('Social feed')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-trending')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-top-traders')).toBeNull();
  });

  it('switches to Top traders when its pill is pressed', () => {
    renderWithProvider(<PerpsSocialFeedSection />);

    fireEvent.press(
      screen.getByTestId(
        PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TOP_TRADERS_PILL,
      ),
    );

    expect(screen.getByTestId('mock-top-traders')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-trending')).toBeNull();
  });

  it('opens Social when the header is pressed', () => {
    renderWithProvider(<PerpsSocialFeedSection />);

    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_HEADER),
    );

    expect(mockNavigateToSocialLeaderboard).toHaveBeenCalledWith(mockNavigate, {
      source: 'perps_home',
    });
  });

  it('opens Social when See more is pressed in Top traders', () => {
    renderWithProvider(<PerpsSocialFeedSection />);
    fireEvent.press(
      screen.getByTestId(
        PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TOP_TRADERS_PILL,
      ),
    );

    fireEvent.press(screen.getByTestId('mock-top-traders'));

    expect(mockNavigateToSocialLeaderboard).toHaveBeenCalledWith(mockNavigate, {
      source: 'perps_home',
    });
  });
});
