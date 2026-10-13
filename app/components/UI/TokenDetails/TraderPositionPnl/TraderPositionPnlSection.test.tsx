import { render } from '@testing-library/react-native';
import React from 'react';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { useTokenBalance } from '../hooks/useTokenBalance';
import TraderPositionPnlSection from './TraderPositionPnlSection';
import { useOpenPositionHeader } from './useOpenPositionHeader';

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
    | Record<string, unknown>
    | undefined;

const renderSection = () =>
  render(<TraderPositionPnlSection token={token} tokenKey="0x1:0xabc" />);

describe('TraderPositionPnlSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    footerProps.length = 0;
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
  });

  it('passes a loading header through before a value arrives', () => {
    mockUseOpenPositionHeader.mockReturnValue({ isLoading: true });

    renderSection();

    expect(positionProp()).toEqual(
      expect.objectContaining({ isLoading: true, positionValue: undefined }),
    );
  });

  it('hides the position row when there is no value and no load in flight', () => {
    mockUseOpenPositionHeader.mockReturnValue({ isLoading: false });

    renderSection();

    expect(positionProp()).toBeUndefined();
  });

  it('marks the footer as having a balance only when the token balance is positive', () => {
    mockUseOpenPositionHeader.mockReturnValue({ isLoading: false });
    mockUseTokenBalance.mockReturnValue({
      balance: '0',
      fiatBalance: '$0.00',
      tokenFormattedBalance: '0 PEPE',
    } as ReturnType<typeof useTokenBalance>);

    renderSection();

    expect(footerProps[footerProps.length - 1].hasTokenBalance).toBe(false);
  });
});
