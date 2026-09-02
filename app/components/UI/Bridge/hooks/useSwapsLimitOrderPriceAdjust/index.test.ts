import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenFiatRate } from '../useTokenFiatRate';
import { createMockToken } from '../../testUtils/fixtures';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { getSwapsLimitOrderPriceMarketComparison } from '../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison';
import { useSwapsLimitOrderPriceAdjust } from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenFiatRate', () => ({
  useTokenFiatRate: jest.fn(),
}));

jest.mock('../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison');

const mockUseSelector = jest.mocked(useSelector);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);
const mockGetSwapsLimitOrderPriceMarketComparison = jest.mocked(
  getSwapsLimitOrderPriceMarketComparison,
);
const actualGetSwapsLimitOrderPriceMarketComparison = jest.requireActual<{
  getSwapsLimitOrderPriceMarketComparison: typeof getSwapsLimitOrderPriceMarketComparison;
}>(
  '../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison',
).getSwapsLimitOrderPriceMarketComparison;

const sourceToken = createMockToken({
  address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  symbol: 'ETH',
  decimals: 18,
});

const destToken = createMockToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
});

function mockFiatRates({
  sourceRate = 2000,
  destRate = 1,
}: {
  sourceRate?: number | undefined;
  destRate?: number | undefined;
} = {}) {
  mockUseTokenFiatRate.mockImplementation((token) => {
    if (token?.symbol === 'ETH') {
      return sourceRate;
    }
    if (token?.symbol === 'USDC') {
      return destRate;
    }
    return undefined;
  });
}

function renderPriceAdjustHook(
  overrides: {
    destToken?: typeof destToken;
    sourceToken?: typeof sourceToken;
  } = {},
) {
  return renderHook((props) => useSwapsLimitOrderPriceAdjust(props), {
    initialProps: {
      destToken: overrides.destToken ?? destToken,
      sourceToken: overrides.sourceToken ?? sourceToken,
    },
  });
}

describe('useSwapsLimitOrderPriceAdjust', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue('usd');
    mockFiatRates();
    mockGetSwapsLimitOrderPriceMarketComparison.mockImplementation(
      actualGetSwapsLimitOrderPriceMarketComparison,
    );
  });

  it('starts in buy mode with market price seeded from the quoted token fiat rate, with no source amount entered', () => {
    const { result } = renderPriceAdjustHook();

    expect(result.current.executionType).toBe(LimitOrderExecutionType.BUY);
    expect(result.current.isLimitFiatMode).toBe(true);
    expect(result.current.limitPrice).toBe('1');
    expect(result.current.quotedSymbol).toBe('USDC');
    expect(result.current.counterToken).toEqual(sourceToken);
  });

  it('reseeds market price after flipping quote unit when source and dest fiat rates match', () => {
    const usdt = createMockToken({
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
      decimals: 6,
    });
    mockUseTokenFiatRate.mockImplementation(() => 1);

    const { result } = renderPriceAdjustHook({
      sourceToken: usdt,
    });

    expect(result.current.limitPrice).toBe('1');

    act(() => {
      result.current.onQuoteUnitPress?.();
    });

    expect(result.current.executionType).toBe(LimitOrderExecutionType.SELL);
    expect(result.current.limitPrice).toBe('1');
    expect(result.current.quotedSymbol).toBe('USDT');
  });

  it('does not reseed market price after the user edits the limit price', () => {
    const { result, rerender } = renderPriceAdjustHook();

    act(() => {
      result.current.handleLimitPriceChange('2');
    });

    mockFiatRates({ destRate: 1.2 });

    rerender({
      destToken,
      sourceToken,
    });

    expect(result.current.limitPrice).toBe('2');
  });

  it('applies market preset on handleMarketPress', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.handleMarketPress();
    });

    expect(result.current.limitPrice).toBe('1');
    expect(result.current.isCustomActive).toBe(false);
  });

  it('omits market comparison when market is applied to a sub-dollar dest token', () => {
    mockFiatRates({ destRate: 0.10298176120674981 });

    const { result } = renderPriceAdjustHook();

    expect(result.current.limitPrice).not.toBe('0.1');
    expect(result.current.marketComparison).toBeUndefined();
  });

  it('applies negative percent preset in buy mode', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.handlePercentPress(5);
    });

    expect(result.current.limitPrice).toBe('0.95');
  });

  it('applies positive percent preset in sell mode', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.onQuoteUnitPress?.();
    });

    act(() => {
      result.current.handlePercentPress(5);
    });

    expect(result.current.executionType).toBe(LimitOrderExecutionType.SELL);
    expect(result.current.limitPrice).toBe('2100');
    expect(result.current.quotedSymbol).toBe('ETH');
  });

  it('commits a valid custom percent into the limit price', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.handleCustomPress();
      result.current.handleCustomValueChange('5');
    });

    act(() => {
      result.current.commitCustomPercent();
    });

    expect(result.current.limitPrice).toBe('0.95');
    expect(result.current.isCustomActive).toBe(true);
  });

  it('exits custom mode without changing the limit price when custom percent is empty', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.handleLimitPriceChange('3');
      result.current.handleCustomPress();
      result.current.handleCustomValueChange('');
    });

    act(() => {
      result.current.commitCustomPercent();
    });

    expect(result.current.limitPrice).toBe('3');
    expect(result.current.isCustomActive).toBe(false);
    expect(result.current.customValue).toBe('');
  });

  it('commits a zero custom percent as the market price', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.handleLimitPriceChange('3');
      result.current.handleCustomPress();
      result.current.handleCustomValueChange('0');
    });

    act(() => {
      result.current.commitCustomPercent();
    });

    expect(result.current.limitPrice).toBe('1');
    expect(result.current.isCustomActive).toBe(true);
    expect(result.current.customValue).toBe('0');
  });

  it('toggles fiat mode when both token fiat rates are available', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.onAmountTypeTogglePress?.();
    });

    expect(result.current.isLimitFiatMode).toBe(false);
    expect(result.current.limitPrice).toBe('0.0005');
    expect(result.current.secondaryValue).toBe('$1.00');
  });

  it('converts the committed custom percent when toggling amount type in the same turn', () => {
    const { result } = renderPriceAdjustHook();

    act(() => {
      result.current.handleCustomPress();
      result.current.handleCustomValueChange('5');
    });

    act(() => {
      result.current.commitCustomPercent();
      result.current.onAmountTypeTogglePress?.();
    });

    expect(result.current.isLimitFiatMode).toBe(false);
    expect(result.current.limitPrice).toBe('0.000475');
    expect(result.current.secondaryValue).toBe('$0.95');
  });

  it('seeds the new pair market price when the selected assets change', () => {
    const dai = createMockToken({
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      decimals: 18,
    });
    mockUseTokenFiatRate.mockImplementation((token) => {
      if (token?.symbol === 'ETH') {
        return 2000;
      }
      if (token?.symbol === 'DAI') {
        return 1;
      }
      return undefined;
    });

    const { result, rerender } = renderPriceAdjustHook({
      destToken: dai,
    });

    expect(result.current.limitPrice).toBe('1');

    const usdc = destToken;
    mockUseTokenFiatRate.mockImplementation((token) => {
      if (token?.symbol === 'ETH') {
        return 2000;
      }
      if (token?.symbol === 'USDC') {
        return 1.5;
      }
      return undefined;
    });

    rerender({
      destToken: usdc,
      sourceToken,
    });

    expect(result.current.limitPrice).toBe('1.5');
  });

  it('keeps counter-token denomination after quoted fiat rate updates', () => {
    const { result, rerender } = renderPriceAdjustHook();

    act(() => {
      result.current.onAmountTypeTogglePress?.();
    });

    mockFiatRates({ destRate: 1.1 });

    rerender({
      destToken,
      sourceToken,
    });

    expect(result.current.isLimitFiatMode).toBe(false);
    expect(result.current.limitPrice).toBe('0.0005');
  });

  it('omits amount type toggle when a token fiat rate is unavailable', () => {
    mockUseTokenFiatRate.mockReturnValue(undefined);
    const { result } = renderPriceAdjustHook();

    expect(result.current.onAmountTypeTogglePress).toBeUndefined();
  });

  describe('live market tracking', () => {
    it('suppresses market comparison while tracking market, even if the raw comparison would show one', () => {
      // Simulates the one-render lag right after a market data update, where
      // limitPrice hasn't resynced yet and the raw comparison would report a
      // false divergence. isTrackingMarket must suppress it unconditionally.
      mockGetSwapsLimitOrderPriceMarketComparison.mockReturnValue({
        label: 'stale comparison',
        isNegative: true,
      });

      const { result } = renderPriceAdjustHook();

      expect(result.current.marketComparison).toBeUndefined();
    });

    it('surfaces the market comparison once tracking market stops', () => {
      mockGetSwapsLimitOrderPriceMarketComparison.mockReturnValue({
        label: 'real comparison',
        isNegative: true,
      });

      const { result } = renderPriceAdjustHook();

      act(() => {
        result.current.handleLimitPriceChange('2');
      });

      expect(result.current.marketComparison).toEqual({
        label: 'real comparison',
        isNegative: true,
      });
    });

    it('follows the market rate while the price sits at market', () => {
      const { result, rerender } = renderPriceAdjustHook();

      expect(result.current.limitPrice).toBe('1');

      mockFiatRates({ destRate: 1.2 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('1.2');
    });

    it('stops following the market after a percent preset, and resumes after the market preset', () => {
      const { result, rerender } = renderPriceAdjustHook();

      act(() => {
        result.current.handlePercentPress(5);
      });

      expect(result.current.limitPrice).toBe('0.95');

      mockFiatRates({ destRate: 1.2 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('0.95');

      act(() => {
        result.current.handleMarketPress();
      });

      expect(result.current.limitPrice).toBe('1.2');

      mockFiatRates({ destRate: 1.5 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('1.5');
    });

    it('follows the market after a zero custom percent is committed', () => {
      const { result, rerender } = renderPriceAdjustHook();

      act(() => {
        result.current.handleCustomPress();
        result.current.handleCustomValueChange('0');
      });

      act(() => {
        result.current.commitCustomPercent();
      });

      mockFiatRates({ destRate: 1.2 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('1.2');
      expect(result.current.isCustomActive).toBe(true);
    });

    it('stops following the market after a non-zero custom percent is committed', () => {
      const { result, rerender } = renderPriceAdjustHook();

      act(() => {
        result.current.handleCustomPress();
        result.current.handleCustomValueChange('5');
      });

      act(() => {
        result.current.commitCustomPercent();
      });

      expect(result.current.limitPrice).toBe('0.95');

      mockFiatRates({ destRate: 1.2 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('0.95');
    });

    it('stops following the market after the denomination is toggled', () => {
      const { result, rerender } = renderPriceAdjustHook();

      act(() => {
        result.current.onAmountTypeTogglePress?.();
      });

      expect(result.current.limitPrice).toBe('0.0005');

      mockFiatRates({ destRate: 1.2 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('0.0005');
    });

    it('follows the market in counter-token denomination after the market preset', () => {
      const { result, rerender } = renderPriceAdjustHook();

      act(() => {
        result.current.onAmountTypeTogglePress?.();
      });

      act(() => {
        result.current.handleMarketPress();
      });

      expect(result.current.isLimitFiatMode).toBe(false);
      expect(result.current.limitPrice).toBe('0.0005');

      mockFiatRates({ destRate: 2 });
      rerender({ destToken, sourceToken });

      expect(result.current.limitPrice).toBe('0.001');
    });
  });

  it('resets price fields when the token pair changes', () => {
    const { result, rerender } = renderPriceAdjustHook();

    act(() => {
      result.current.handleLimitPriceChange('2');
    });

    rerender({
      destToken,
      sourceToken: {
        ...sourceToken,
        address: '0x0000000000000000000000000000000000000001',
      },
    });

    expect(result.current.limitPrice).toBe('1');
    expect(result.current.isCustomActive).toBe(false);
  });
});
