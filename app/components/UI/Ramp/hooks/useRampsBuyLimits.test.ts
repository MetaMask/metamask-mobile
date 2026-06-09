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
  id: 'test-provider',
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
  selectedProvider = mockProvider as RampProvider | null,
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

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store } as never, children);

  return { Wrapper };
};

describe('useRampsBuyLimits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormatters.mockReturnValue({
      formatCurrency: (value: number, _currency: string) =>
        `$${value.toFixed(2)}`,
    } as unknown as ReturnType<typeof useFormatters>);
  });

  describe('return value structure', () => {
    it('returns currency, amountLimitError, minAmount, maxAmount', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current).toMatchObject({
        amountLimitError: null,
        currency: 'USD',
      });
      expect(
        typeof result.current.minAmount === 'number' ||
          result.current.minAmount === undefined,
      ).toBe(true);
      expect(
        typeof result.current.maxAmount === 'number' ||
          result.current.maxAmount === undefined,
      ).toBe(true);
    });
  });

  describe('currency from userRegion', () => {
    it('uses userRegion.country.currency as the currency', () => {
      const store = createMockStore({
        userRegion: {
          country: { currency: 'EUR' },
          state: null,
          regionCode: 'de',
        },
      });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.currency).toBe('EUR');
    });

    it('defaults currency to USD when userRegion is null', () => {
      const store = createMockStore({
        userRegion: null,
        selectedProvider: null,
      });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.currency).toBe('USD');
    });
  });

  describe('provider resolution from selected provider', () => {
    it('resolves limits from the selected provider in Redux', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 5,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.minAmount).toBe(10);
      expect(result.current.maxAmount).toBe(1000);
    });

    it('returns graceful defaults when no provider is selected', () => {
      const store = createMockStore({ selectedProvider: null });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
      expect(result.current.minAmount).toBeUndefined();
      expect(result.current.maxAmount).toBeUndefined();
    });
  });

  describe('amount validation - in range', () => {
    it('returns amountLimitError null when amount is within range', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
    });

    it('returns amountLimitError null at exact minAmount boundary', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 10, // exactly minAmount
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
    });

    it('returns amountLimitError null at exact maxAmount boundary', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 1000, // exactly maxAmount
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
    });
  });

  describe('amount validation - below minimum', () => {
    it('returns min purchase error when amount is below minAmount', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 5, // below minAmount of 10
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBe('Minimum purchase is $10.00');
    });

    it('exposes minAmount from provider limits', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 5,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.minAmount).toBe(10);
    });
  });

  describe('amount validation - above maximum', () => {
    it('returns max purchase error when amount exceeds maxAmount', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 2000, // above maxAmount of 1000
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBe(
        'Maximum purchase is $1000.00',
      );
    });

    it('exposes maxAmount from provider limits', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 2000,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.maxAmount).toBe(1000);
    });
  });

  describe('null provider', () => {
    it('returns amountLimitError null and minAmount/maxAmount undefined when provider is null', () => {
      const store = createMockStore({ selectedProvider: null });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
      expect(result.current.minAmount).toBeUndefined();
      expect(result.current.maxAmount).toBeUndefined();
    });
  });

  describe('backendError fallback', () => {
    it('passes backendError through when provider has no structured limits', () => {
      const providerWithoutLimits: RampProvider = {
        ...mockProvider,
        limits: {},
      };
      const store = createMockStore({
        selectedProvider: providerWithoutLimits,
      });
      const { Wrapper } = createWrapper(store);

      const backendError = 'Minimum purchase is 12 EUR';

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 5,
            paymentMethodId: PAYMENT_METHOD_ID,
            backendError,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBe(backendError);
    });

    it('returns null for backendError that is not a limit error', () => {
      const providerWithoutLimits: RampProvider = {
        ...mockProvider,
        limits: {},
      };
      const store = createMockStore({
        selectedProvider: providerWithoutLimits,
      });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 50,
            paymentMethodId: PAYMENT_METHOD_ID,
            backendError: 'Some unrelated error',
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
    });

    it('returns null when backendError is null and amount is 0', () => {
      const store = createMockStore({ selectedProvider: null });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 0,
            paymentMethodId: PAYMENT_METHOD_ID,
            backendError: null,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.amountLimitError).toBeNull();
    });
  });

  describe('limit bucket uses currency from userRegion', () => {
    it('looks up limits in the EUR bucket when userRegion.country.currency is EUR', () => {
      const store = createMockStore({
        userRegion: {
          country: { currency: 'EUR' },
          state: null,
          regionCode: 'de',
        },
      });
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useRampsBuyLimits({
            amount: 5, // below EUR minAmount of 12
            paymentMethodId: PAYMENT_METHOD_ID,
          }),
        { wrapper: Wrapper },
      );

      // EUR minAmount is 12, so amount=5 should trigger a min error
      expect(result.current.amountLimitError).toBe('Minimum purchase is $12.00');
      expect(result.current.minAmount).toBe(12);
      expect(result.current.maxAmount).toBe(900);
    });
  });
});
