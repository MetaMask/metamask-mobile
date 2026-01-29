import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setSelectedPaymentMethod: jest.fn(),
    },
  },
}));

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit/Credit Card',
    score: 100,
    icon: 'card',
  },
  {
    id: '/payments/bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Bank Transfer',
    score: 90,
    icon: 'bank',
  },
];

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            paymentMethods: [],
            selectedPaymentMethod: null,
            paymentMethodsLoading: false,
            paymentMethodsError: null,
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
  });

  describe('return value structure', () => {
    it('returns paymentMethods, selectedPaymentMethod, setSelectedPaymentMethod, isLoading, and error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        paymentMethods: [],
        selectedPaymentMethod: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.setSelectedPaymentMethod).toBe('function');
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

  describe('selectedPaymentMethod state', () => {
    it('returns selectedPaymentMethod from state', () => {
      const store = createMockStore({
        selectedPaymentMethod: mockPaymentMethods[0],
      });
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.selectedPaymentMethod).toEqual(
        mockPaymentMethods[0],
      );
    });

    it('returns null when selectedPaymentMethod is not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.selectedPaymentMethod).toBeNull();
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when paymentMethodsLoading is true', () => {
      const store = createMockStore({
        paymentMethodsLoading: true,
      });
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error from paymentMethodsError state', () => {
      const store = createMockStore({
        paymentMethodsError: 'Network error',
      });
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('setSelectedPaymentMethod', () => {
    it('calls Engine.context.RampsController.setSelectedPaymentMethod with payment method id', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedPaymentMethod(mockPaymentMethods[0]);
      });

      expect(
        Engine.context.RampsController.setSelectedPaymentMethod,
      ).toHaveBeenCalledWith(mockPaymentMethods[0].id);
    });

    it('calls Engine.context.RampsController.setSelectedPaymentMethod with undefined when payment method is null', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPaymentMethods(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedPaymentMethod(null);
      });

      expect(
        Engine.context.RampsController.setSelectedPaymentMethod,
      ).toHaveBeenCalledWith(undefined);
    });
  });
});
