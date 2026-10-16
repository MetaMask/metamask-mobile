import { render } from '@testing-library/react-native';
import React from 'react';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { useTokenBalance } from '../hooks/useTokenBalance';
import TraderPositionPnlSection from './TraderPositionPnlSection';
import { useOpenPositionHeader } from './useOpenPositionHeader';

const mockOpenComposer = jest.fn();
const mockSocialLeaderboardEnabled = jest.fn(() => true);
const mockUseSocialV1 = jest.fn(() => true);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => mockSocialLeaderboardEnabled(),
}));

jest.mock('../../../../hooks', () => ({
  useABTest: () => ({ variant: { useSocialV1: mockUseSocialV1() } }),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
  }),
);

const footerProps: Record<string, unknown>[] = [];

jest.mock(
  '../components/TokenDetailsStickyFooter',
  () => (props: Record<string, unknown>) => {
    footerProps.push(props);
    return null;
  },
);

jest.mock('../hooks/useStickyQuickBuy', () => ({
  useStickyQuickBuy: jest.fn(),
}));

jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: jest.fn(),
}));

jest.mock('./useOpenPositionHeader', () => ({
  useOpenPositionHeader: jest.fn(),
}));

const mockUseStickyQuickBuy = useStickyQuickBuy as jest.MockedFunction<
  typeof useStickyQuickBuy
>;
const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<
  typeof useTokenBalance
>;
const mockUseOpenPositionHeader = useOpenPositionHeader as jest.MockedFunction<
  typeof useOpenPositionHeader
>;

const token = { address: '0xabc', chainId: '0x1' } as TokenDetailsRouteParams;

/** The `traderPositionPnl` prop handed to the sticky footer on the last render. */
const positionProp = () =>
  footerProps[footerProps.length - 1].traderPositionPnl as
    | {
        positionValue?: string;
        isLoading?: boolean;
        expandedDetails?: Record<string, unknown> & { onShare?: () => void };
      }
    | undefined;

const renderSection = () =>
  render(<TraderPositionPnlSection token={token} tokenKey="0x1:0xabc" />);

describe('TraderPositionPnlSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    footerProps.length = 0;
    mockSocialLeaderboardEnabled.mockReturnValue(true);
    mockUseSocialV1.mockReturnValue(true);
    mockUseStickyQuickBuy.mockReturnValue({
      onQuickBuyPress: jest.fn(),
      openQuickBuy: jest.fn(),
      quickBuySheet: null,
    } as unknown as ReturnType<typeof useStickyQuickBuy>);
    mockUseTokenBalance.mockReturnValue({
      balance: '10',
      fiatBalance: '$90.00',
      tokenFormattedBalance: '10 PEPE',
    } as ReturnType<typeof useTokenBalance>);
  });

  it('passes the position value and PnL to the footer', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      positionValue: '$150.00',
      pnl: { amount: '+$50.00', percentage: '+50.00%', isProfit: true },
      sharePosition: null,
      isLoading: false,
    });

    renderSection();

    expect(positionProp()).toEqual(
      expect.objectContaining({
        positionValue: '$150.00',
        pnl: { amount: '+$50.00', percentage: '+50.00%', isProfit: true },
        isLoading: false,
      }),
    );
    expect(positionProp()).not.toHaveProperty('expandedDetails');
  });

  describe('expanded position details', () => {
    const expandedDetails = {
      averageCost: '$0.0005',
      realizedPnl: '+$50.25',
      unrealizedPnl: '+$1,200.00',
      holdTime: '—',
    };
    const sharePosition = {
      positionId: 'pos-1',
      tokenSymbol: 'PEPE',
      tokenName: 'Pepe',
      tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      chain: 'ethereum',
      isOpen: true,
      positionAmount: 100,
      costBasis: 50,
      currentValueUSD: 80,
      realizedPnl: 0,
      pnlValueUsd: 30,
      pnlPercent: 60,
      boughtUsd: 50,
      soldUsd: 0,
      perpPositionType: null,
      perpLeverage: null,
      positionAmountWithLeverage: null,
      costBasisWithLeverage: null,
      marginUsd: null,
      trades: [{ timestamp: 1_700_000_000 }],
      lastTradeAt: 1_700_000_100,
    };

    beforeEach(() => {
      mockUseOpenPositionHeader.mockReturnValue({
        positionValue: '$2,000.00',
        pnl: { amount: '+$1,200.00', percentage: '+150.00%', isProfit: true },
        expandedDetails,
        sharePosition,
        isLoading: false,
      });
    });

    it('opens the composer with the open position attached and the token-details entry point', () => {
      renderSection();

      positionProp()?.expandedDetails?.onShare?.();

      expect(mockOpenComposer).toHaveBeenCalledWith({
        position: expect.objectContaining({
          positionId: 'pos-1',
          tokenSymbol: 'PEPE',
          isOpen: true,
        }),
        entryPoint: 'token_details',
      });
    });

    it('hides Share to feed until a sharable position loads', () => {
      mockUseOpenPositionHeader.mockReturnValue({
        positionValue: '$2,000.00',
        pnl: { amount: '+$1,200.00', percentage: '+150.00%', isProfit: true },
        expandedDetails,
        sharePosition: null,
        isLoading: false,
      });

      renderSection();

      expect(positionProp()?.expandedDetails).not.toHaveProperty('onShare');
    });

    it('hides Share to feed in the Social V1 control arm', () => {
      mockUseSocialV1.mockReturnValue(false);

      renderSection();

      expect(positionProp()).toEqual(
        expect.objectContaining({ expandedDetails }),
      );
    });

    it('hides Share to feed when Social is off', () => {
      mockSocialLeaderboardEnabled.mockReturnValue(false);

      renderSection();

      expect(positionProp()).toEqual(
        expect.objectContaining({ expandedDetails }),
      );
    });
  });

  it('passes a loading header through before a value arrives', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: true,
    });

    renderSection();

    expect(positionProp()).toEqual(
      expect.objectContaining({ isLoading: true, positionValue: undefined }),
    );
  });

  it('hides the position row when there is no value and no load in flight', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: false,
    });

    renderSection();

    expect(positionProp()).toBeUndefined();
  });

  it('marks the footer as having a balance only when the token balance is positive', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: false,
    });
    mockUseTokenBalance.mockReturnValue({
      balance: '0',
      fiatBalance: '$0.00',
      tokenFormattedBalance: '0 PEPE',
    } as ReturnType<typeof useTokenBalance>);

    renderSection();

    expect(footerProps[footerProps.length - 1].hasTokenBalance).toBe(false);
  });
});
