import { getProviderBuyLimit, ProviderBuyLimit } from './providerLimits';
import type { Provider } from '@metamask/ramps-controller';

const mockLimit: ProviderBuyLimit = {
  minAmount: 10,
  maxAmount: 1000,
  feeFixedRate: 1.5,
  feeDynamicRate: 0.03,
};

const mockLimitCard: ProviderBuyLimit = {
  minAmount: 20,
  maxAmount: 5000,
  feeFixedRate: 2.0,
  feeDynamicRate: 0.04,
};

const mockLimitEur: ProviderBuyLimit = {
  minAmount: 15,
  maxAmount: 2000,
};

function buildProvider(overrides?: Record<string, unknown>): Provider {
  return {
    id: 'test-provider',
    name: 'Test Provider',
    ...overrides,
  } as Provider;
}

describe('getProviderBuyLimit', () => {
  describe('happy path', () => {
    it('returns the limit object for a valid provider, fiat currency, and payment method', () => {
      const provider = buildProvider({
        limits: {
          fiat: {
            usd: {
              bank_transfer: mockLimit,
            },
          },
        },
      });

      const result = getProviderBuyLimit(provider, 'usd', 'bank_transfer');
      expect(result).toEqual(mockLimit);
    });
  });

  describe('null and undefined guard clauses', () => {
    it('returns undefined when provider is null', () => {
      expect(getProviderBuyLimit(null, 'usd', 'bank_transfer')).toBeUndefined();
    });

    it('returns undefined when provider is undefined', () => {
      expect(
        getProviderBuyLimit(undefined, 'usd', 'bank_transfer'),
      ).toBeUndefined();
    });

    it('returns undefined when fiatCurrency is null', () => {
      const provider = buildProvider({
        limits: { fiat: { usd: { bank_transfer: mockLimit } } },
      });
      expect(
        getProviderBuyLimit(provider, null, 'bank_transfer'),
      ).toBeUndefined();
    });

    it('returns undefined when fiatCurrency is undefined', () => {
      const provider = buildProvider({
        limits: { fiat: { usd: { bank_transfer: mockLimit } } },
      });
      expect(
        getProviderBuyLimit(provider, undefined, 'bank_transfer'),
      ).toBeUndefined();
    });

    it('returns undefined when paymentMethodId is null', () => {
      const provider = buildProvider({
        limits: { fiat: { usd: { bank_transfer: mockLimit } } },
      });
      expect(getProviderBuyLimit(provider, 'usd', null)).toBeUndefined();
    });

    it('returns undefined when paymentMethodId is undefined', () => {
      const provider = buildProvider({
        limits: { fiat: { usd: { bank_transfer: mockLimit } } },
      });
      expect(getProviderBuyLimit(provider, 'usd', undefined)).toBeUndefined();
    });
  });

  describe('missing or partial limits structure', () => {
    it('returns undefined when provider has no limits field', () => {
      const provider = buildProvider();
      expect(
        getProviderBuyLimit(provider, 'usd', 'bank_transfer'),
      ).toBeUndefined();
    });

    it('returns undefined when provider has limits but no fiat key', () => {
      const provider = buildProvider({ limits: {} });
      expect(
        getProviderBuyLimit(provider, 'usd', 'bank_transfer'),
      ).toBeUndefined();
    });

    it('returns undefined when fiat currency is not found in limits', () => {
      const provider = buildProvider({
        limits: {
          fiat: {
            eur: { bank_transfer: mockLimitEur },
          },
        },
      });
      expect(
        getProviderBuyLimit(provider, 'usd', 'bank_transfer'),
      ).toBeUndefined();
    });

    it('returns undefined when payment method is not found under the fiat currency', () => {
      const provider = buildProvider({
        limits: {
          fiat: {
            usd: { bank_transfer: mockLimit },
          },
        },
      });
      expect(
        getProviderBuyLimit(provider, 'usd', 'credit_card'),
      ).toBeUndefined();
    });
  });

  describe('case insensitivity of fiatCurrency', () => {
    const provider = buildProvider({
      limits: {
        fiat: {
          usd: { bank_transfer: mockLimit },
        },
      },
    });

    it('matches uppercase "USD" to lowercase "usd" key', () => {
      expect(getProviderBuyLimit(provider, 'USD', 'bank_transfer')).toEqual(
        mockLimit,
      );
    });

    it('matches mixed case "Usd" to lowercase "usd" key', () => {
      expect(getProviderBuyLimit(provider, 'Usd', 'bank_transfer')).toEqual(
        mockLimit,
      );
    });
  });

  describe('multiple currencies and payment methods', () => {
    const provider = buildProvider({
      limits: {
        fiat: {
          usd: {
            bank_transfer: mockLimit,
            credit_card: mockLimitCard,
          },
          eur: {
            bank_transfer: mockLimitEur,
          },
        },
      },
    });

    it('returns the correct limit for the requested fiat currency', () => {
      expect(getProviderBuyLimit(provider, 'eur', 'bank_transfer')).toEqual(
        mockLimitEur,
      );
    });

    it('does not return a limit from a different fiat currency', () => {
      const result = getProviderBuyLimit(provider, 'usd', 'bank_transfer');
      expect(result).toEqual(mockLimit);
      expect(result).not.toEqual(mockLimitEur);
    });

    it('returns the correct limit for the requested payment method', () => {
      expect(getProviderBuyLimit(provider, 'usd', 'credit_card')).toEqual(
        mockLimitCard,
      );
    });

    it('does not return a limit from a different payment method', () => {
      const result = getProviderBuyLimit(provider, 'usd', 'bank_transfer');
      expect(result).toEqual(mockLimit);
      expect(result).not.toEqual(mockLimitCard);
    });
  });
});
