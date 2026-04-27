import React, { createRef } from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TopTradersSection from './TopTradersSection';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();

const mockTraders = [
  {
    id: 'trader-1',
    rank: 1,
    username: 'alice',
    percentageChange: 96.2,
    pnlValue: 963000,
    isFollowing: false,
  },
];

const mockUseTopTraders = jest.fn((_options?: unknown) => ({
  traders: mockTraders,
  isLoading: false,
  error: null,
  refresh: mockRefetch,
  toggleFollow: jest.fn(),
}));

jest.mock('./hooks', () => ({
  useTopTraders: (args: unknown) => mockUseTopTraders(args),
}));

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
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
  });

  it('returns null when the API returns no traders', () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(screen.queryByTestId('homepage-top-traders-carousel')).toBeNull();
  });

  it('renders skeletons while loading even when traders is empty', () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: true,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(
      screen.getByTestId('homepage-top-traders-carousel'),
    ).toBeOnTheScreen();
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

  it('navigates to the trader profile with correct params when a card is tapped', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    fireEvent.press(screen.getByTestId('top-trader-card-pressable-trader-1'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.PROFILE,
      { traderId: 'trader-1', traderName: 'alice' },
    );
  });

  it('exposes refresh via ref and resolves when called', async () => {
    const ref = createRef<SectionRefreshHandle>();
    renderWithProvider(<TopTradersSection ref={ref} {...defaultProps} />);

    expect(ref.current).not.toBeNull();
    await expect(ref.current?.refresh()).resolves.toBeUndefined();
  });

  it('invokes onLayout from useHomeViewedEvent when the section root lays out', () => {
    const mockOnLayout = jest.fn();
    const mockUseHomeViewedEvent = jest.requireMock(
      '../../hooks/useHomeViewedEvent',
    ).default as jest.Mock;
    mockUseHomeViewedEvent.mockReturnValueOnce({ onLayout: mockOnLayout });

    renderWithProvider(<TopTradersSection {...defaultProps} />);
    const root = screen.getByTestId('homepage-top-traders-section-root');
    fireEvent(root, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 200 } },
    });

    expect(mockOnLayout).toHaveBeenCalled();
  });
});
