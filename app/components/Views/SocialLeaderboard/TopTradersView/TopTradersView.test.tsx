import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TopTradersView from './TopTradersView';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';

const mockGoBack = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
  };
});

const fixtureTraders: TopTrader[] = [
  {
    id: 'trader-1',
    rank: 1,
    username: 'sniperliquid.hl',
    avatarUri: 'https://example.com/avatar1.png',
    percentageChange: 43,
    pnlValue: 963146.8,
    isFollowing: false,
  },
  {
    id: 'trader-2',
    rank: 2,
    username: 'nervousdegen',
    avatarUri: 'https://example.com/avatar2.png',
    percentageChange: 359,
    pnlValue: 474751.45,
    isFollowing: false,
  },
  {
    id: 'trader-3',
    rank: 3,
    username: 'baznocap',
    avatarUri: 'https://example.com/avatar3.png',
    percentageChange: 617,
    pnlValue: 374735.16,
    isFollowing: false,
  },
];

const mockUseTopTraders: UseTopTradersResult = {
  traders: fixtureTraders,
  isLoading: false,
  error: null,
  refresh: mockRefresh,
  toggleFollow: mockToggleFollow,
};

const mockSelectSocialLeaderboardEnabled = jest.fn((): boolean => true);
jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockSelectSocialLeaderboardEnabled(),
  }),
);

jest.mock('../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: () => mockUseTopTraders,
}));

describe('TopTradersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the Top Traders title', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('Top Traders')).toBeOnTheScreen();
  });

  it('renders the search button', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(screen.getByTestId(TopTradersViewSelectorsIDs.BACK_BUTTON));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('handles search button press without error', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.SEARCH_BUTTON),
    );
  });

  it('renders all traders', () => {
    renderWithProvider(<TopTradersView />);
    fixtureTraders.forEach((trader) => {
      expect(screen.getByText(trader.username)).toBeOnTheScreen();
    });
  });

  it('renders the rank for the top trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('1.')).toBeOnTheScreen();
  });

  it('renders the ROI for the first trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
  });

  it('calls toggleFollow when Follow button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    const followButtons = screen.getAllByText('Follow');
    fireEvent.press(followButtons[0]);
    expect(mockToggleFollow).toHaveBeenCalledWith(fixtureTraders[0].id);
  });

  it('navigates back when the feature flag is disabled', () => {
    mockSelectSocialLeaderboardEnabled.mockReturnValue(false);
    renderWithProvider(<TopTradersView />);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
