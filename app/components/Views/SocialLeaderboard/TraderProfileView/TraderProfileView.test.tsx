import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderProfileView from './TraderProfileView';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import Routes from '../../../../constants/navigation/Routes';
import type { UseTraderProfileResult } from './hooks/useTraderProfile';
import type { UseTraderPositionsResult } from './hooks/useTraderPositions';
import type {
  TraderProfileResponse,
  Position,
} from '@metamask/social-controllers';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: () => 'https://example.com/token.png',
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({
      params: { traderId: 'trader-1', traderName: 'dutchiono' },
    }),
  };
});

const fixtureProfile: TraderProfileResponse = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'dutchiono',
    imageUrl: 'https://example.com/avatar.png',
  },
  stats: {
    pnl30d: 20610,
    winRate30d: 0.92,
    roiPercent30d: 1.5,
    tradeCount30d: 48,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: {},
  followerCount: 45,
  followingCount: 12,
};

const fixtureOpenPositions: Position[] = [
  {
    tokenSymbol: 'STARKBOT',
    tokenName: 'Starkbot',
    tokenAddress: '0x123',
    chain: 'base',
    positionAmount: 1500000000,
    boughtUsd: 1200,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 1200,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: 2259.96,
    pnlValueUsd: 1059.96,
    pnlPercent: 182,
  },
];

let mockProfileResult: UseTraderProfileResult = {
  profile: fixtureProfile,
  isLoading: false,
  error: null,
  isFollowing: false,
  isFollowLoading: false,
  toggleFollow: mockToggleFollow,
  refresh: mockRefresh,
};

let mockPositionsResult: UseTraderPositionsResult = {
  openPositions: fixtureOpenPositions,
  closedPositions: [],
  isLoadingOpen: false,
  isLoadingClosed: false,
  error: null,
};

jest.mock('./hooks', () => ({
  useTraderProfile: () => mockProfileResult,
  useTraderPositions: () => mockPositionsResult,
}));

describe('TraderProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileResult = {
      profile: fixtureProfile,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow: mockToggleFollow,
      refresh: mockRefresh,
    };
    mockPositionsResult = {
      openPositions: fixtureOpenPositions,
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
    };
  });

  it('renders the container', () => {
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('displays the trader name', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getAllByText('dutchiono')[0]).toBeOnTheScreen();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(
      screen.getByTestId(TraderProfileViewSelectorsIDs.BACK_BUTTON),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders follower count', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('45 followers')).toBeOnTheScreen();
  });

  it('renders the win rate stat', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('92%')).toBeOnTheScreen();
  });

  it('renders the Follow button when not following', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('Follow')).toBeOnTheScreen();
  });

  it('renders the Following button when following', () => {
    mockProfileResult.isFollowing = true;
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('Following')).toBeOnTheScreen();
  });

  it('calls toggleFollow when the follow button is pressed', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(screen.getByTestId('trader-profile-follow-button'));
    expect(mockToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('renders open positions', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('STARKBOT')).toBeOnTheScreen();
    expect(screen.getByText('$2,259.96')).toBeOnTheScreen();
  });

  it('navigates to the trader position view when a position is pressed', () => {
    renderWithProvider(<TraderProfileView />);

    fireEvent.press(screen.getByTestId('position-row-STARKBOT'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        traderId: 'trader-1',
        traderName: 'dutchiono',
        tokenSymbol: fixtureOpenPositions[0].tokenSymbol,
        position: fixtureOpenPositions[0],
      },
    );
  });

  it('shows empty state when no positions', () => {
    mockPositionsResult.openPositions = [];
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('No positions yet')).toBeOnTheScreen();
  });

  it('switches to closed tab', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(screen.getByTestId('trader-profile-tab-closed'));
    expect(screen.getByText('No positions yet')).toBeOnTheScreen();
  });

  it('renders skeleton placeholders when profile is loading', () => {
    mockProfileResult.isLoading = true;
    mockProfileResult.profile = null;
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.queryByText('45 followers')).not.toBeOnTheScreen();
  });

  it('renders position skeletons when positions are loading', () => {
    mockPositionsResult.isLoadingOpen = true;
    renderWithProvider(<TraderProfileView />);
    expect(screen.queryByText('STARKBOT')).not.toBeOnTheScreen();
  });

  it('renders closed position skeletons when closed tab is loading', () => {
    mockPositionsResult.isLoadingClosed = true;
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(
      screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_CLOSED),
    );
    expect(screen.queryByText('No positions yet')).not.toBeOnTheScreen();
  });

  it('notification button press is a no-op', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(
      screen.getByTestId(TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON),
    );
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders skeleton when profile is null even if not loading', () => {
    mockProfileResult.profile = null;
    renderWithProvider(<TraderProfileView />);
    expect(screen.queryByText('45 followers')).not.toBeOnTheScreen();
  });

  describe('error state', () => {
    beforeEach(() => {
      mockProfileResult.profile = null;
      mockProfileResult.isLoading = false;
      mockProfileResult.error = 'Network request failed';
    });

    it('shows the error banner instead of skeleton when profile fetch fails', () => {
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.getByTestId(TraderProfileViewSelectorsIDs.ERROR_BANNER),
      ).toBeOnTheScreen();
    });

    it('displays the error message text', () => {
      renderWithProvider(<TraderProfileView />);
      expect(screen.getByText("Couldn't load profile")).toBeOnTheScreen();
    });

    it('displays the retry button', () => {
      renderWithProvider(<TraderProfileView />);
      expect(screen.getByText('Retry')).toBeOnTheScreen();
    });

    it('calls refresh when the retry button is pressed', () => {
      renderWithProvider(<TraderProfileView />);
      fireEvent.press(screen.getByText('Retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not show skeleton when error is present', () => {
      renderWithProvider(<TraderProfileView />);
      expect(screen.queryByText('45 followers')).not.toBeOnTheScreen();
      expect(screen.queryByText('Follow')).not.toBeOnTheScreen();
    });

    it('does not show error banner while still loading', () => {
      mockProfileResult.isLoading = true;
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.ERROR_BANNER),
      ).not.toBeOnTheScreen();
    });

    it('does not show error banner when profile loaded successfully', () => {
      mockProfileResult.profile = fixtureProfile;
      mockProfileResult.error = 'stale error';
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.ERROR_BANNER),
      ).not.toBeOnTheScreen();
      expect(screen.getByText('45 followers')).toBeOnTheScreen();
    });
  });
});
