import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenFiatRate } from '../useTokenFiatRate';
import { createMockToken } from '../../testUtils/fixtures';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { useSwapsLimitOrderPriceAdjust } from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenFiatRate', () => ({
  useTokenFiatRate: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);

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
    destTokenAmount?: string | undefined;
    sourceToken?: typeof sourceToken;
  } = {},
) {
  return renderHook((props) => useSwapsLimitOrderPriceAdjust(props), {
    initialProps: {
      destToken: overrides.destToken ?? destToken,
      destTokenAmount: overrides.destTokenAmount ?? '1.5',
      sourceToken: overrides.sourceToken ?? sourceToken,
    },
  });
}

describe('useSwapsLimitOrderPriceAdjust', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue('usd');
    mockFiatRates();
  });

  it('starts in buy mode with market price seeded from the quoted token fiat rate', () => {
    const { result } = renderPriceAdjustHook();

    expect(result.current.executionType).toBe(LimitOrderExecutionType.BUY);
    expect(result.current.isLimitFiatMode).toBe(true);
    expect(result.current.limitPrice).toBe('1');
    expect(result.current.quotedSymbol).toBe('USDC');
    expect(result.current.counterToken).toEqual(sourceToken);
  });

  it('does not reseed market price after the user edits the limit price', () => {
    const { result, rerender } = renderPriceAdjustHook();

    act(() => {
      result.current.handleLimitPriceChange('2');
    });

    rerender({
      destToken,
      destTokenAmount: '2.0',
      sourceToken,
    });

    expect(result.current.limitPrice).toBe('2');
  });

  it('applies market preset on handleMarketPress', () => {
    const { result } = renderPriceAdjustHook({
      destTokenAmount: undefined,
    });

    act(() => {
      result.current.handleMarketPress();
    });

    expect(result.current.limitPrice).toBe('1');
    expect(result.current.isCustomActive).toBe(false);
  });

  it('applies negative percent preset in buy mode', () => {
    const { result } = renderPriceAdjustHook({
      destTokenAmount: undefined,
    });

    act(() => {
      result.current.handlePercentPress(5);
    });

    expect(result.current.limitPrice).toBe('0.95');
  });

  it('applies positive percent preset in sell mode', () => {
    const { result } = renderPriceAdjustHook({
      destTokenAmount: undefined,
    });

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
    const { result } = renderPriceAdjustHook({
      destTokenAmount: undefined,
    });

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

  it('ignores commitCustomPercent when custom percent is invalid', () => {
    const { result } = renderPriceAdjustHook({
      destTokenAmount: undefined,
    });

    act(() => {
      result.current.handleLimitPriceChange('3');
      result.current.handleCustomPress();
      result.current.handleCustomValueChange('0');
    });

    act(() => {
      result.current.commitCustomPercent();
    });

    expect(result.current.limitPrice).toBe('3');
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

  it('omits amount type toggle when a token fiat rate is unavailable', () => {
    mockUseTokenFiatRate.mockReturnValue(undefined);
    const { result } = renderPriceAdjustHook();

    expect(result.current.onAmountTypeTogglePress).toBeUndefined();
  });

  it('resets price fields when the token pair changes', () => {
    const { result, rerender } = renderPriceAdjustHook();

    act(() => {
      result.current.handleLimitPriceChange('2');
    });

    rerender({
      destToken,
      destTokenAmount: '1.5',
      sourceToken: {
        ...sourceToken,
        address: '0x0000000000000000000000000000000000000001',
      },
    });

    expect(result.current.limitPrice).toBe('1');
    expect(result.current.isCustomActive).toBe(false);
  });
});
