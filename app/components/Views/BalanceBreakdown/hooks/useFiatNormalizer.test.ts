import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import React from 'react';
import { useFiatNormalizer } from './useFiatNormalizer';

const mockStore = configureStore([]);

function buildStore(usdRate: number | undefined, currentCurrency: string) {
  return mockStore({
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency,
          currencyRates:
            usdRate === undefined ? {} : { usd: { conversionRate: usdRate } },
        },
      },
    },
  });
}

function wrapper(store: ReturnType<typeof mockStore>) {
  const StoreProvider = Provider as unknown as React.ComponentType<{
    store: ReturnType<typeof mockStore>;
  }>;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(StoreProvider, { store }, children);
}

describe('useFiatNormalizer', () => {
  it('passes through USD amounts when user currency is USD', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(100)).toBe(100);
  });

  it('converts USD → EUR using conversionRate', () => {
    const store = buildStore(0.92, 'EUR');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(100)).toBeCloseTo(92);
  });

  it('does not relabel USD when a non-USD conversion rate is unavailable', () => {
    const store = buildStore(undefined, 'EUR');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(100)).toBeUndefined();
  });

  it('returns 0 for zero amount', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(0)).toBe(0);
  });

  it('returns 0 for NaN input', () => {
    const store = buildStore(1, 'USD');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.toUserCurrency(NaN)).toBe(0);
  });

  it('returns userCurrency from state', () => {
    const store = buildStore(1, 'GBP');
    const { result } = renderHook(() => useFiatNormalizer(), {
      wrapper: wrapper(store),
    });
    expect(result.current.userCurrency).toBe('GBP');
  });
});
