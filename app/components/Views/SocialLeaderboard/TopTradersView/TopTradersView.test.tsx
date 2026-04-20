import React from 'react';
import { act, screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TopTradersView from './TopTradersView';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import Logger from '../../../../util/Logger';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
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
    pnlPerChain: { base: 500000, ethereum: 463146.8 },
    isFollowing: false,
  },
  {
    id: 'trader-2',
    rank: 2,
    username: 'nervousdegen',
    avatarUri: 'https://example.com/avatar2.png',
    percentageChange: 359,
    pnlValue: 474751.45,
    pnlPerChain: { base: 474751.45 },
    isFollowing: false,
  },
  {
    id: 'trader-3',
    rank: 3,
    username: 'baznocap',
    avatarUri: 'https://example.com/avatar3.png',
    percentageChange: 617,
    pnlValue: 374735.16,
    pnlPerChain: { solana: 374735.16 },
    isFollowing: false,
  },
];

const defaultUseTopTradersResult: UseTopTradersResult = {
  traders: fixtureTraders,
  isLoading: false,
  error: null,
  refresh: mockRefresh as () => Promise<void>,
  toggleFollow: mockToggleFollow,
};

const mockUseTopTradersHook = jest.fn(() => defaultUseTopTradersResult);

const mockSelectSocialLeaderboardEnabled = jest.fn((): boolean => true);
jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockSelectSocialLeaderboardEnabled(),
  }),
);

jest.mock('../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: () => mockUseTopTradersHook(),
}));

describe('TopTradersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTopTradersHook.mockImplementation(() => defaultUseTopTradersResult);
    mockSelectSocialLeaderboardEnabled.mockReturnValue(true);
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

  it('search button press fires with no side effects', () => {
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

  it('renders a RefreshControl with the correct props on the trader list', () => {
    renderWithProvider(<TopTradersView />);

    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);
    const { refreshControl } = list.props;

    expect(typeof refreshControl.props.onRefresh).toBe('function');
    expect(typeof refreshControl.props.refreshing).toBe('boolean');
  });

  it('calls refresh when the scroll view is pulled down', async () => {
    mockRefresh.mockResolvedValue(undefined);
    renderWithProvider(<TopTradersView />);
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('logs an error when refresh fails', async () => {
    const refreshError = new Error('fetch failed');
    mockRefresh.mockRejectedValue(refreshError);
    renderWithProvider(<TopTradersView />);
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      refreshError,
      'TopTradersView: pull-to-refresh failed',
    );
  });

  it('navigates back when the feature flag is disabled', () => {
    mockSelectSocialLeaderboardEnabled.mockReturnValue(false);
    renderWithProvider(<TopTradersView />);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders all four chain filter pills', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_BASE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_SOLANA),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ETHEREUM),
    ).toBeOnTheScreen();
  });

  it('filters traders when a chain pill is tapped', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_BASE),
    );
    expect(screen.getByText('sniperliquid.hl')).toBeOnTheScreen();
    expect(screen.getByText('nervousdegen')).toBeOnTheScreen();
    expect(screen.queryByText('baznocap')).not.toBeOnTheScreen();
  });

  it('shows all traders when All filter is tapped after filtering', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_SOLANA),
    );
    expect(screen.queryByText('sniperliquid.hl')).not.toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ALL),
    );
    expect(screen.getByText('sniperliquid.hl')).toBeOnTheScreen();
    expect(screen.getByText('baznocap')).toBeOnTheScreen();
  });

  it('re-ranks traders within filtered results', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_SOLANA),
    );
    expect(screen.getByText('1.')).toBeOnTheScreen();
    expect(screen.queryByText('3.')).not.toBeOnTheScreen();
  });

  it('renders skeletons during initial load', () => {
    mockUseTopTradersHook.mockReturnValueOnce({
      ...defaultUseTopTradersResult,
      isLoading: true,
      traders: [],
    });
    renderWithProvider(<TopTradersView />);
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(screen.queryByText('sniperliquid.hl')).not.toBeOnTheScreen();
  });
});
