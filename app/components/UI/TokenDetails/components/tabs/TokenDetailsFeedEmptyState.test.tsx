import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import type { TraderPosition } from '../../TraderPositionPnl/types';
import TokenDetailsFeedEmptyState from './TokenDetailsFeedEmptyState';

jest.mock('@rive-app/react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Alignment: { Center: 'center' },
    Fit: { Contain: 'contain' },
    RiveView: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
    useRiveFile: () => ({ riveFile: { mock: true }, error: undefined }),
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);

const mockOpenComposer = jest.fn();
const mockUseOpenPositionHeader = jest.fn(
  (): { sharePosition: TraderPosition | null; isPositionLoading: boolean } => ({
    sharePosition: null,
    isPositionLoading: false,
  }),
);

jest.mock(
  '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
  }),
);

jest.mock('../../TraderPositionPnl/useOpenPositionHeader', () => ({
  useOpenPositionHeader: () => mockUseOpenPositionHeader(),
}));

const token = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
} as TokenDetailsRouteParams;

const sharePosition = {
  positionId: 'pepe-open',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
  isOpen: true,
  positionAmount: 100,
  costBasis: 20,
  currentValueUSD: 25,
  realizedPnl: 0,
  pnlValueUsd: 5,
  pnlPercent: 25,
  boughtUsd: 20,
  soldUsd: 0,
  perpPositionType: null,
  perpLeverage: null,
  positionAmountWithLeverage: null,
  costBasisWithLeverage: null,
  marginUsd: null,
  trades: [],
  lastTradeAt: 1,
} as TraderPosition;

describe('TokenDetailsFeedEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isPositionLoading: false,
    });
  });

  it('invites a trade without a button when the wallet does not hold the token', () => {
    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance={false} />);

    expect(screen.getByText('Post your trade')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "You'll get 15% of the fees every time someone copies your moves.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Start your first post')).toBeNull();
    expect(screen.queryByText('Create MetaMask Post')).toBeNull();
    expect(
      screen.getByTestId('token-details-feed-empty-megaphone'),
    ).toBeOnTheScreen();
  });

  it('invites a first post when the wallet holds the token', () => {
    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance />);

    expect(screen.getByText('Start your first post')).toBeOnTheScreen();
    expect(screen.queryByText('Post your trade')).toBeNull();

    fireEvent.press(screen.getByText('Create MetaMask Post'));

    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
    expect(mockOpenComposer).toHaveBeenCalledWith();
    expect(
      screen.getByTestId('token-details-feed-empty-megaphone'),
    ).toBeOnTheScreen();
  });

  it('opens the composer on this token when the wallet holds it', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition,
    } as never);

    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance token={token} />);

    fireEvent.press(screen.getByText('Create MetaMask Post'));

    expect(mockOpenComposer).toHaveBeenCalledWith({
      position: expect.objectContaining({
        positionId: 'pepe-open',
        tokenSymbol: 'PEPE',
      }),
      entryPoint: 'token_details',
    });
  });

  it('shows the static megaphone when Reduce Motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    renderWithProvider(<TokenDetailsFeedEmptyState hasBalance={false} />);

    expect(
      screen.getByTestId('token-details-feed-empty-megaphone-fallback', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('token-details-feed-empty-megaphone'),
    ).toBeNull();
  });
});
