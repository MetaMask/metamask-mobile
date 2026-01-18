import { determinePreferredProvider } from './determinePreferredProvider';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { Provider } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { Order } from '@consensys/on-ramp-sdk';

const mockProvider1: Provider = {
  id: 'provider-1',
  name: 'Provider One',
  environmentType: 'PRODUCTION',
  description: 'Test Provider 1',
  hqAddress: '123 Test St',
  links: [],
  logos: {
    light: 'https://example.com/logo1-light.png',
    dark: 'https://example.com/logo1-dark.png',
    height: 24,
    width: 79,
  },
};

const mockProvider2: Provider = {
  id: 'provider-2',
  name: 'Provider Two',
  environmentType: 'PRODUCTION',
  description: 'Test Provider 2',
  hqAddress: '456 Test St',
  links: [],
  logos: {
    light: 'https://example.com/logo2-light.png',
    dark: 'https://example.com/logo2-dark.png',
    height: 24,
    width: 79,
  },
};

const mockTransakProvider: Provider = {
  id: 'transak',
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description: 'Transak Provider',
  hqAddress: '789 Test St',
  links: [],
  logos: {
    light: 'https://example.com/transak-light.png',
    dark: 'https://example.com/transak-dark.png',
    height: 24,
    width: 79,
  },
};

describe('determinePreferredProvider', () => {
  describe('when no providers are available', () => {
    it('returns null', () => {
      const result = determinePreferredProvider([], []);
      expect(result).toBeNull();
    });
  });

  describe('when user has completed orders', () => {
    it('returns provider from most recent completed aggregator order', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {
            provider: { id: 'provider-1' },
          } as Order,
        },
        {
          id: 'order-2',
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 2000,
          amount: '200',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {
            provider: { id: 'provider-2' },
          } as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockProvider2);
    });

    it('returns Transak provider for DEPOSIT orders', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {} as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockTransakProvider);
    });

    it('returns Transak provider for TRANSAK orders', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.TRANSAK,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {} as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockTransakProvider);
    });

    it('returns provider from other order types', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.MOONPAY,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {} as Order,
        },
      ];

      const moonpayProvider: Provider = {
        ...mockProvider1,
        id: 'MOONPAY',
        name: 'MoonPay',
      };

      const providers = [mockProvider1, moonpayProvider, mockTransakProvider];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(moonpayProvider);
    });

    it('ignores non-completed orders', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.PENDING,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {
            provider: { id: 'provider-1' },
          } as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockTransakProvider);
    });

    it('returns Transak if provider from order is not in available providers', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {
            provider: { id: 'non-existent-provider' },
          } as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockTransakProvider);
    });
  });

  describe('when user has no orders', () => {
    it('returns Transak provider if available', () => {
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider([], providers);

      expect(result).toEqual(mockTransakProvider);
    });

    it('returns first provider if Transak is not available', () => {
      const providers = [mockProvider1, mockProvider2];

      const result = determinePreferredProvider([], providers);

      expect(result).toEqual(mockProvider1);
    });
  });

  describe('provider matching', () => {
    it('matches provider by id case-insensitively', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {
            provider: { id: 'PROVIDER-1' },
          } as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockProvider1);
    });

    it('matches provider by name case-insensitively', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {
            provider: { id: 'provider one' },
          } as Order,
        },
      ];

      const providers = [mockProvider1, mockProvider2];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(mockProvider1);
    });

    it('matches Transak by id containing "transak"', () => {
      const orders: FiatOrder[] = [
        {
          id: 'order-1',
          provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
          createdAt: 1000,
          amount: '100',
          currency: 'USD',
          cryptocurrency: 'ETH',
          state: FIAT_ORDER_STATES.COMPLETED,
          account: '0x123',
          network: '1',
          orderType: 'BUY',
          data: {} as Order,
        },
      ];

      const transakVariant: Provider = {
        ...mockTransakProvider,
        id: 'transak-provider-v2',
      };

      const providers = [mockProvider1, transakVariant];

      const result = determinePreferredProvider(orders, providers);

      expect(result).toEqual(transakVariant);
    });
  });
});
