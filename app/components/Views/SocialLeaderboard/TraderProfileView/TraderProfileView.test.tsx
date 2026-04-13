import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderProfileView from './TraderProfileView';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import type { UseTraderProfileResult } from './hooks/useTraderProfile';
import type { UseTraderPositionsResult } from './hooks/useTraderPositions';
import type {
  TraderProfileResponse,
  Position,
} from '@metamask/social-controllers';

const mockGoBack = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: () => 'https://example.com/token.png',
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
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
});
