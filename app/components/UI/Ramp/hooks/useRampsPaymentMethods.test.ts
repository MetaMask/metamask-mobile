import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import { RequestStatus, type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer: "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Bank Transfer',
    score: 80,
    icon: 'bank',
    disclaimer: 'Bank transfers may take 1-3 business days.',
    delay: '1-3 business days',
    pendingOrderDescription:
      'Bank transfers may take a few business days to complete.',
  },
];

const mockPaymentMethodsResponse = {
  payments: mockPaymentMethods,
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getPaymentMethods: jest.fn().mockResolvedValue({
        payments: [
          {
            id: '/payments/debit-credit-card',
            paymentType: 'debit-credit-card',
            name: 'Debit or Credit',
            score: 90,
            icon: 'card',
            disclaimer:
              "Credit card purchases may incur your bank's cash advance fees.",
            delay: '5 to 10 minutes.',
            pendingOrderDescription:
              'Card purchases may take a few minutes to complete.',
          },
        ],
      }),
    },
  },
}));

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: null,
            paymentMethods: [],
            requests: {},
            ...rampsControllerState,
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsPaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      Engine.context.RampsController.getPaymentMethods as jest.Mock
    ).mockResolvedValue(mockPaymentMethodsResponse);
  });

  describe('return value structure', () => {
    it('returns paymentMethods, isLoading, error, and fetchPaymentMethods', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        paymentMethods: [],
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchPaymentMethods).toBe('function');
    });
  });

  describe('paymentMethods state', () => {
    it('returns paymentMethods from state', () => {
      const store = createMockStore({ paymentMethods: mockPaymentMethods });
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    it('returns empty array when paymentMethods are not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.paymentMethods).toEqual([]);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when request is loading', () => {
      const store = createMockStore({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/slip44:60","/providers/transak"]':
            {
              status: RequestStatus.LOADING,
              data: null,
              error: null,
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });
      const { result } = renderHook(
        () =>
          useRampsPaymentMethods({
            region: 'us-ca',
            fiat: 'usd',
            assetId: 'eip155:1/slip44:60',
            provider: '/providers/transak',
          }),
        {
          wrapper: wrapper(store),
        },
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading false when request is not loading', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('returns error from request state', () => {
      const store = createMockStore({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/slip44:60","/providers/transak"]':
            {
              status: RequestStatus.ERROR,
              data: null,
              error: 'Network error',
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });
      const { result } = renderHook(
        () =>
          useRampsPaymentMethods({
            region: 'us-ca',
            fiat: 'usd',
            assetId: 'eip155:1/slip44:60',
            provider: '/providers/transak',
          }),
        {
          wrapper: wrapper(store),
        },
      );
      expect(result.current.error).toBe('Network error');
    });

    it('returns null error when no error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchPaymentMethods', () => {
    it('calls getPaymentMethods with required options', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchPaymentMethods({
        assetId: 'eip155:1/slip44:60',
        provider: '/providers/transak',
      });
      expect(
        Engine.context.RampsController.getPaymentMethods,
      ).toHaveBeenCalledWith({
        assetId: 'eip155:1/slip44:60',
        provider: '/providers/transak',
      });
    });

    it('calls getPaymentMethods with all options when provided', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchPaymentMethods({
        assetId: 'eip155:1/slip44:60',
        provider: '/providers/transak',
        region: 'us-ca',
        fiat: 'usd',
        forceRefresh: true,
      });
      expect(
        Engine.context.RampsController.getPaymentMethods,
      ).toHaveBeenCalledWith({
        assetId: 'eip155:1/slip44:60',
        provider: '/providers/transak',
        region: 'us-ca',
        fiat: 'usd',
        forceRefresh: true,
      });
    });

    it('returns payment methods response', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      const response = await result.current.fetchPaymentMethods({
        assetId: 'eip155:1/slip44:60',
        provider: '/providers/transak',
      });
      expect(response).toEqual(mockPaymentMethodsResponse);
    });

    it('rejects with error when getPaymentMethods fails', async () => {
      const store = createMockStore();
      const mockGetPaymentMethods = Engine.context.RampsController
        .getPaymentMethods as jest.Mock;
      mockGetPaymentMethods.mockReset();
      mockGetPaymentMethods.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });

      await expect(
        result.current.fetchPaymentMethods({
          assetId: 'eip155:1/slip44:60',
          provider: '/providers/transak',
        }),
      ).rejects.toThrow('Network error');
    });
  });
});
