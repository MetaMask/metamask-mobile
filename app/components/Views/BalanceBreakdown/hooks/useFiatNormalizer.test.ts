import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import React from 'react';
import { useFiatNormalizer } from './useFiatNormalizer';

const mockStore = configureStore([]);

function buildStore(usdRate: number, currentCurrency: string) {
  return mockStore({
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency,
          currencyRates: {
            usd: { conversionRate: usdRate },
            eth: { conversionRate: 2500 },
          },
        },
      },
    },
  });
}

function wrapper(store: ReturnType<typeof mockStore>) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store, children });
}

describe('useFiatNormalizer', () => {
  it('passes through USD amounts when user currency is USD', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(100, 'usd')).toBe(100);
  });

  it('converts USD → EUR using conversionRate', () => {
    const store = buildStore(0.92, 'EUR');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(100, 'usd')).toBeCloseTo(92);
  });

  it('treats USDC as 1:1 with USD', () => {
    const store = buildStore(0.92, 'EUR');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    // 100 USDC → 100 USD → 92 EUR
    expect(result.current.toUserCurrency(100, 'usdc')).toBeCloseTo(92);
  });

  it('returns 0 for zero amount', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(0, 'usd')).toBe(0);
  });

  it('returns 0 for NaN input', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(NaN, 'usd')).toBe(0);
  });

  it('returns amount unchanged for unknown symbol (passthrough)', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    // unknown symbol → passthrough unchanged
    expect(result.current.toUserCurrency(50, 'sol')).toBe(50);
  });

  it('returns userCurrency from state', () => {
    const store = buildStore(1, 'GBP');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.userCurrency).toBe('GBP');
  });
});
