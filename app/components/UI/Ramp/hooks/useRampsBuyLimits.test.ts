import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsBuyLimits } from './useRampsBuyLimits';
import type { Provider as RampProvider } from '@metamask/ramps-controller';
import { useFormatters } from '../../../hooks/useFormatters';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (key === 'fiat_on_ramp.min_purchase_limit') {
      return `Minimum purchase is ${params?.amount}`;
    }
    if (key === 'fiat_on_ramp.max_purchase_limit') {
      return `Maximum purchase is ${params?.amount}`;
    }
    return key;
  },
  locale: 'en',
}));

jest.mock('../../../hooks/useFormatters', () => ({
  useFormatters: jest.fn(),
}));

const mockUseFormatters = jest.mocked(useFormatters);

const mockProvider: RampProvider = {
  id: '/providers/test-provider',
  name: 'Test Provider',
  environmentType: 'PRODUCTION',
  description: 'Test Provider Description',
  hqAddress: '123 Test St, City, ST 12345',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 79,
  },
  limits: {
    fiat: {
      usd: {
        '/payments/debit-credit-card': {
          minAmount: 10,
          maxAmount: 1000,
          feeFixedRate: 0,
          feeDynamicRate: 0,
        },
      },
      eur: {
        '/payments/debit-credit-card': {
          minAmount: 12,
          maxAmount: 900,
          feeFixedRate: 0,
          feeDynamicRate: 0,
        },
      },
    },
  },
};

const PAYMENT_METHOD_ID = '/payments/debit-credit-card';

const createMockStore = ({
  userRegion = {
    country: { currency: 'USD' },
    state: null,
    regionCode: 'us',
  },
  selectedProvider = mockProvider,
}: {
  userRegion?: unknown;
  selectedProvider?: RampProvider | null;
} = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion,
            providers: {
              data: selectedProvider ? [selectedProvider] : [],
              selected: selectedProvider,
              isLoading: false,
              error: null,
            },
          },
        },
      }),
    },
  });

const renderWithStore = (
  store: ReturnType<typeof createMockStore>,
  options: Parameters<typeof useRampsBuyLimits>[0],
) =>
  renderHook(() => useRampsBuyLimits(options), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as never, children),
  });

describe('useRampsBuyLimits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormatters.mockReturnValue({
      formatCurrency: (value: number, _currency: string) =>
        `$${value.toFixed(2)}`,
    } as unknown as ReturnType<typeof useFormatters>);
  });

  describe('selected provider from state', () => {
    it('exposes the selected provider limits', () => {
      const { result } = renderWithStore(createMockStore(), {
        amount: 5,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.minAmount).toBe(10);
      expect(result.current.maxAmount).toBe(1000);
    });

    it('returns graceful defaults when no provider is selected', () => {
      const { result } = renderWithStore(
        createMockStore({ selectedProvider: null }),
        {
          amount: 50,
          paymentMethodId: PAYMENT_METHOD_ID,
        },
      );

      expect(result.current.amountLimitError).toBeNull();
      expect(result.current.minAmount).toBeUndefined();
      expect(result.current.maxAmount).toBeUndefined();
    });
  });

  describe('currency', () => {
    it('uses userRegion.country.currency as the currency', () => {
      const store = createMockStore({
        userRegion: {
          country: { currency: 'EUR' },
          state: null,
          regionCode: 'de',
        },
      });

      const { result } = renderWithStore(store, {
        amount: 50,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.currency).toBe('EUR');
    });

    it('defaults currency to USD when userRegion is null', () => {
      const store = createMockStore({
        userRegion: null,
        selectedProvider: null,
      });

      const { result } = renderWithStore(store, {
        amount: 50,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.currency).toBe('USD');
    });

    it('looks up limits in the currency bucket from userRegion', () => {
      const store = createMockStore({
        userRegion: {
          country: { currency: 'EUR' },
          state: null,
          regionCode: 'de',
        },
      });

      const { result } = renderWithStore(store, {
        amount: 5,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.amountLimitError).toBe('Minimum purchase is $12.00');
      expect(result.current.minAmount).toBe(12);
      expect(result.current.maxAmount).toBe(900);
    });

    it('looks up limits in the currency override bucket when provided', () => {
      const store = createMockStore({
        userRegion: {
          country: { currency: 'EUR' },
          state: null,
          regionCode: 'de',
        },
      });

      const { result } = renderWithStore(store, {
        amount: 5,
        paymentMethodId: PAYMENT_METHOD_ID,
        currency: 'USD',
      });

      expect(result.current.currency).toBe('USD');
      expect(result.current.minAmount).toBe(10);
      expect(result.current.maxAmount).toBe(1000);
    });
  });

  describe('amount validation', () => {
    it.each([
      ['within range', 50],
      ['at exact minAmount boundary', 10],
      ['at exact maxAmount boundary', 1000],
    ])('returns no error when amount is %s', (_label, amount) => {
      const { result } = renderWithStore(createMockStore(), {
        amount,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.amountLimitError).toBeNull();
    });

    it('returns min purchase error when amount is below minAmount', () => {
      const { result } = renderWithStore(createMockStore(), {
        amount: 5,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.amountLimitError).toBe('Minimum purchase is $10.00');
    });

    it('returns max purchase error when amount exceeds maxAmount', () => {
      const { result } = renderWithStore(createMockStore(), {
        amount: 2000,
        paymentMethodId: PAYMENT_METHOD_ID,
      });

      expect(result.current.amountLimitError).toBe(
        'Maximum purchase is $1000.00',
      );
    });
  });
});
