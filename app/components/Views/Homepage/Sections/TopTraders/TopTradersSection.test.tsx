import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TopTradersSection from './TopTradersSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    CASH: 'cash',
    TOKENS: 'tokens',
    WHATS_HAPPENING: 'whats_happening',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
    TOP_TRADERS: 'top_traders',
  },
}));

const mockSelectSocialLeaderboardEnabled = jest.requireMock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
).selectSocialLeaderboardEnabled;

const defaultProps = { sectionIndex: 1, totalSectionsLoaded: 3 };

describe('TopTradersSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSocialLeaderboardEnabled.mockImplementation(() => true);
  });

  it('returns null when the feature flag is disabled', () => {
    mockSelectSocialLeaderboardEnabled.mockImplementation(() => false);
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(screen.queryByTestId('homepage-top-traders-carousel')).toBeNull();
  });

  it('renders the carousel when the feature flag is enabled', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(
      screen.getByTestId('homepage-top-traders-carousel'),
    ).toBeOnTheScreen();
  });

  it('navigates to the Top Traders view when the section header is pressed', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    fireEvent.press(screen.getByText('Top Traders'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
  });
});
