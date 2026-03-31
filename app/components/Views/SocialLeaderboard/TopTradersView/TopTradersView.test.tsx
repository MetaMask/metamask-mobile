import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TopTradersView from './TopTradersView';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';
import fixtureData from '../../Homepage/Sections/TopTraders/__fixtures__/leaderboardResponse.json';
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

/** Map fixture JSON entries to the TopTrader UI type. */
const fixtureTraders: TopTrader[] = fixtureData.traders.map((entry) => ({
  id: entry.profileId,
  rank: entry.rank,
  username: entry.name,
  avatarUri: entry.imageUrl,
  percentageChange: (entry.roi30d ?? 0) * 100,
  pnlValue: entry.pnl30d,
  isFollowing: false,
}));

const mockUseTopTraders: UseTopTradersResult = {
  traders: fixtureTraders,
  isLoading: false,
  error: null,
  refresh: mockRefresh,
  toggleFollow: mockToggleFollow,
};

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

  it('renders all 15 traders from fixture data', () => {
    renderWithProvider(<TopTradersView />);
    fixtureTraders.forEach((trader) => {
      expect(screen.getByText(trader.username)).toBeOnTheScreen();
    });
  });

  it('renders the rank for the top trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('1.')).toBeOnTheScreen();
  });

  it('renders correct ROI for the first trader (43%)', () => {
    renderWithProvider(<TopTradersView />);
    // roi30d = 0.43, multiplied by 100 = 43.0%
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
  });

  it('calls toggleFollow when Follow button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    const followButtons = screen.getAllByText('Follow');
    fireEvent.press(followButtons[0]);
    expect(mockToggleFollow).toHaveBeenCalledWith(fixtureTraders[0].id);
  });
});
