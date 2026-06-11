import type { Provider } from '@metamask/ramps-controller';
import { getProviderLimitMessage } from './getProviderLimitMessage';
import { getProviderBuyLimit, type ProviderBuyLimit } from './providerLimits';

jest.mock('./providerLimits', () => ({
  getProviderBuyLimit: jest.fn(),
}));

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
}));

const mockGetProviderBuyLimit = jest.mocked(getProviderBuyLimit);

const mockProvider = { id: '/providers/test', name: 'Test' } as Provider;

const formatCurrency = jest.fn(
  (value: number, currency: string) => `${currency} ${value}`,
);

const baseArgs = {
  provider: mockProvider,
  fiatCurrency: 'usd',
  paymentMethodId: '/payments/card',
  currency: 'USD',
  formatCurrency: formatCurrency as never,
};

const withLimit = (limit: ProviderBuyLimit) =>
  mockGetProviderBuyLimit.mockReturnValue(limit);

describe('getProviderLimitMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderBuyLimit.mockReturnValue(undefined);
  });

  describe('structured limits', () => {
    it('returns a localized minimum message when amount is below minAmount', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      const result = getProviderLimitMessage({ ...baseArgs, amount: 5 });

      expect(result).toBe('Minimum purchase is USD 10');
      expect(formatCurrency).toHaveBeenCalledWith(10, 'USD', {
        currencyDisplay: 'narrowSymbol',
      });
    });

    it('returns a localized maximum message when amount exceeds maxAmount', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      const result = getProviderLimitMessage({ ...baseArgs, amount: 2000 });

      expect(result).toBe('Maximum purchase is USD 1000');
      expect(formatCurrency).toHaveBeenCalledWith(1000, 'USD', {
        currencyDisplay: 'narrowSymbol',
      });
    });

    it('prefers structured limits over the backend error string', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      const result = getProviderLimitMessage({
        ...baseArgs,
        amount: 5,
        backendError: 'Minimum purchase is 99 EUR',
      });

      expect(result).toBe('Minimum purchase is USD 10');
    });

    it('returns null at the exact min boundary', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      expect(getProviderLimitMessage({ ...baseArgs, amount: 10 })).toBeNull();
    });

    it('returns null at the exact max boundary', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      expect(getProviderLimitMessage({ ...baseArgs, amount: 1000 })).toBeNull();
    });

    it('returns null when the amount is within range and there is no backend error', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      expect(getProviderLimitMessage({ ...baseArgs, amount: 500 })).toBeNull();
    });
  });

  describe('amount is not positive', () => {
    it('skips structured limits but still surfaces a backend limit error', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      const result = getProviderLimitMessage({
        ...baseArgs,
        amount: 0,
        backendError: 'Minimum purchase is 12 EUR',
      });

      expect(result).toBe('Minimum purchase is 12 EUR');
      expect(formatCurrency).not.toHaveBeenCalled();
    });

    it('returns null when amount is 0 and there is no backend error', () => {
      withLimit({ minAmount: 10, maxAmount: 1000 });

      expect(getProviderLimitMessage({ ...baseArgs, amount: 0 })).toBeNull();
    });
  });

  describe('backend error fallback (no structured limits)', () => {
    it('returns the backend string when it is a limit message', () => {
      const result = getProviderLimitMessage({
        ...baseArgs,
        amount: 5,
        backendError: 'Minimum purchase is 12 EUR',
      });

      expect(result).toBe('Minimum purchase is 12 EUR');
    });

    it('returns null for a non-limit backend error', () => {
      const result = getProviderLimitMessage({
        ...baseArgs,
        amount: 5,
        backendError: '[object Object]',
      });

      expect(result).toBeNull();
    });

    it('returns null when there is no backend error', () => {
      expect(getProviderLimitMessage({ ...baseArgs, amount: 5 })).toBeNull();
    });
  });
});
