import React from 'react';
import { render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingQuickBuy from './TrendingQuickBuy';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { SocialLeaderboardEventProperties } from '../../../../Views/SocialLeaderboard/analytics';

const mockTrack = jest.fn();
jest.mock(
  '../../../../Views/SocialLeaderboard/analytics/useSocialLeaderboardAnalytics',
  () => ({
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  }),
);

const mockQuickBuyRoot = jest.fn();
jest.mock(
  '../../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/quickBuy',
  () => ({
    QuickBuy: {
      Root: (props: Record<string, unknown>) => {
        mockQuickBuyRoot(props);
        return null;
      },
    },
  }),
);

jest.mock(
  '../../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/features',
  () => ({
    TOP_TRADERS_QUICK_BUY_FEATURES: { tradeModes: ['buy', 'sell'] },
  }),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeToken = (overrides: Partial<TrendingAsset> = {}): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  price: '1.00',
  marketCap: 75_000_000_000,
  aggregatedUsdVolume: 900_000_000,
  ...overrides,
});

describe('TrendingQuickBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders QuickBuy.Root with isVisible=false when token is null', () => {
    render(<TrendingQuickBuy token={null} onClose={jest.fn()} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ isVisible: false }),
    );
  });

  it('renders QuickBuy.Root with isVisible=true when token is provided', () => {
    render(<TrendingQuickBuy token={makeToken()} onClose={jest.fn()} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ isVisible: true }),
    );
  });

  it('maps an ERC-20 TrendingAsset to the correct QuickBuyTarget', () => {
    const token = makeToken({
      assetId: 'eip155:1/erc20:0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
      symbol: 'SNX',
      name: 'Synthetix',
    });

    render(<TrendingQuickBuy token={token} onClose={jest.fn()} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          chain: 'eip155:1',
          tokenAddress: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
          tokenSymbol: 'SNX',
          tokenName: 'Synthetix',
        },
      }),
    );
  });

  it('maps a native (slip44) TrendingAsset to the zero address', () => {
    const token = makeToken({
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      name: 'Ethereum',
    });

    render(<TrendingQuickBuy token={token} onClose={jest.fn()} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
        }),
      }),
    );
  });

  it('passes analyticsContext with source=explore_search to QuickBuy.Root', () => {
    render(<TrendingQuickBuy token={makeToken()} onClose={jest.fn()} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: expect.objectContaining({ source: 'explore_search' }),
      }),
    );
  });

  it('fires SOCIAL_QUICK_BUY_SHEET_VIEWED when token transitions from null to non-null', () => {
    const token = makeToken();
    render(<TrendingQuickBuy token={token} onClose={jest.fn()} />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      expect.objectContaining({
        [SocialLeaderboardEventProperties.SOURCE]: 'explore_search',
        [SocialLeaderboardEventProperties.CAIP19]: token.assetId,
        [SocialLeaderboardEventProperties.MARKET_CAP]: token.marketCap,
      }),
    );
  });

  it('does not fire SOCIAL_QUICK_BUY_SHEET_VIEWED when token is null', () => {
    render(<TrendingQuickBuy token={null} onClose={jest.fn()} />);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('does not re-fire the event while the same token stays visible', () => {
    const token = makeToken();
    const { rerender } = render(
      <TrendingQuickBuy token={token} onClose={jest.fn()} />,
    );

    // Simulate a re-render with the same token (e.g. parent re-renders)
    rerender(<TrendingQuickBuy token={token} onClose={jest.fn()} />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('fires the event again when a new token is opened after closing', () => {
    const tokenA = makeToken({
      assetId: 'eip155:1/erc20:0xaaa',
      symbol: 'AAA',
      name: 'Token A',
    });
    const tokenB = makeToken({
      assetId: 'eip155:1/erc20:0xbbb',
      symbol: 'BBB',
      name: 'Token B',
    });

    const { rerender } = render(
      <TrendingQuickBuy token={tokenA} onClose={jest.fn()} />,
    );
    // Close sheet
    rerender(<TrendingQuickBuy token={null} onClose={jest.fn()} />);
    // Open with a new token
    rerender(<TrendingQuickBuy token={tokenB} onClose={jest.fn()} />);

    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenNthCalledWith(
      2,
      MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      expect.objectContaining({
        [SocialLeaderboardEventProperties.CAIP19]: tokenB.assetId,
      }),
    );
  });

  it('forwards onClose to QuickBuy.Root', () => {
    const onClose = jest.fn();
    render(<TrendingQuickBuy token={makeToken()} onClose={onClose} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ onClose }),
    );
  });
});
