import React from 'react';
import { renderHook, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PerpsOrderProvider, usePerpsOrderContext } from './PerpsOrderContext';
import {
  usePerpsOrderForm,
  UsePerpsOrderFormReturn,
} from '../hooks/usePerpsOrderForm';
import { OrderType } from '../controllers/types';

// Mock the usePerpsOrderForm hook
jest.mock('../hooks/usePerpsOrderForm', () => ({
  usePerpsOrderForm: jest.fn(),
}));

const mockUsePerpsOrderForm = usePerpsOrderForm as jest.MockedFunction<
  typeof usePerpsOrderForm
>;

describe('PerpsOrderContext', () => {
  const mockOrderFormReturn: UsePerpsOrderFormReturn = {
    orderForm: {
      asset: 'BTC',
      direction: 'long',
      amount: '100',
      leverage: 10,
      balancePercent: 10,
      type: 'market' as OrderType,
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      limitPrice: undefined,
    },
    updateOrderForm: jest.fn(),
    setAmount: jest.fn(),
    setLeverage: jest.fn(),
    setDirection: jest.fn(),
    setAsset: jest.fn(),
    setTakeProfitPrice: jest.fn(),
    setStopLossPrice: jest.fn(),
    setLimitPrice: jest.fn(),
    setOrderType: jest.fn(),
    handlePercentageAmount: jest.fn(),
    handleMaxAmount: jest.fn(),
    handleMinAmount: jest.fn(),
    maxPossibleAmount: 1000,
    balanceForValidation: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsOrderForm.mockReturnValue(mockOrderFormReturn);
  });

  const renderHookWithProvider = (
    hook: () => UsePerpsOrderFormReturn,
    providerProps?: {
      initialAsset?: string;
      initialDirection?: 'long' | 'short';
      initialAmount?: string;
      initialLeverage?: number;
      initialType?: OrderType;
    },
  ) =>
    renderHook(hook, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PerpsOrderProvider {...providerProps}>{children}</PerpsOrderProvider>
      ),
    });

  describe('PerpsOrderProvider', () => {
    it('renders children correctly', () => {
      const TestChild = () => <Text>Test Child</Text>;

      const { getByText } = render(
        <PerpsOrderProvider>
          <TestChild />
        </PerpsOrderProvider>,
      );

      expect(getByText('Test Child')).toBeTruthy();
    });

    it('calls usePerpsOrderForm with default props', () => {
      render(
        <PerpsOrderProvider>
          <Text>Test</Text>
        </PerpsOrderProvider>,
      );

      expect(mockUsePerpsOrderForm).toHaveBeenCalledWith({
        initialAsset: undefined,
        initialDirection: undefined,
        initialAmount: undefined,
        initialLeverage: undefined,
        initialType: undefined,
        effectiveAvailableBalance: undefined,
      });
    });

    it('calls usePerpsOrderForm with provided initial props', () => {
      const initialProps = {
        initialAsset: 'ETH',
        initialDirection: 'short' as const,
        initialAmount: '500',
        initialLeverage: 5,
        initialType: 'limit' as OrderType,
      };

      render(
        <PerpsOrderProvider {...initialProps}>
          <Text>Test</Text>
        </PerpsOrderProvider>,
      );

      expect(mockUsePerpsOrderForm).toHaveBeenCalledWith({
        ...initialProps,
        effectiveAvailableBalance: undefined,
      });
    });

    it('provides the order form state to context', () => {
      const { result } = renderHookWithProvider(() => usePerpsOrderContext());

      expect(result.current).toEqual(mockOrderFormReturn);
    });

    it('passes through all properties from usePerpsOrderForm', () => {
      const { result } = renderHookWithProvider(() => usePerpsOrderContext());

      // Check that all expected properties are present
      expect(result.current.orderForm).toBeDefined();
      expect(result.current.updateOrderForm).toBeDefined();
      expect(result.current.setAmount).toBeDefined();
      expect(result.current.setLeverage).toBeDefined();
      expect(result.current.setDirection).toBeDefined();
      expect(result.current.setAsset).toBeDefined();
      expect(result.current.setTakeProfitPrice).toBeDefined();
      expect(result.current.setStopLossPrice).toBeDefined();
      expect(result.current.setLimitPrice).toBeDefined();
      expect(result.current.setOrderType).toBeDefined();
      expect(result.current.handlePercentageAmount).toBeDefined();
      expect(result.current.handleMaxAmount).toBeDefined();
      expect(result.current.handleMinAmount).toBeDefined();
      expect(result.current.maxPossibleAmount).toBeDefined();

      // Check that functions are callable
      expect(typeof result.current.setAmount).toBe('function');
      expect(typeof result.current.setLeverage).toBe('function');
      expect(typeof result.current.updateOrderForm).toBe('function');
    });

    it('updates when usePerpsOrderForm returns new values', () => {
      const { result, rerender } = renderHookWithProvider(() =>
        usePerpsOrderContext(),
      );

      // Initial state
      expect(result.current.orderForm.asset).toBe('BTC');

      // Mock new return value
      const updatedOrderFormReturn = {
        ...mockOrderFormReturn,
        orderForm: {
          ...mockOrderFormReturn.orderForm,
          asset: 'ETH',
          amount: '200',
        },
      };
      mockUsePerpsOrderForm.mockReturnValue(updatedOrderFormReturn);

      rerender(() => usePerpsOrderContext());

      expect(result.current.orderForm.asset).toBe('ETH');
      expect(result.current.orderForm.amount).toBe('200');
    });
  });

  describe('usePerpsOrderContext', () => {
    it('returns context value when used within provider', () => {
      const { result } = renderHookWithProvider(() => usePerpsOrderContext());

      expect(result.current).toEqual(mockOrderFormReturn);
      expect(result.current.orderForm.asset).toBe('BTC');
      expect(result.current.orderForm.direction).toBe('long');
      expect(result.current.orderForm.amount).toBe('100');
      expect(result.current.orderForm.leverage).toBe(10);
      expect(result.current.orderForm.type).toBe('market');
    });

    it('provides access to all form manipulation functions', () => {
      const { result } = renderHookWithProvider(() => usePerpsOrderContext());

      // Test that functions can be called (they're mocked so won't actually do anything)
      expect(() => result.current.setAmount('50')).not.toThrow();
      expect(() => result.current.setLeverage(20)).not.toThrow();
      expect(() => result.current.setDirection('short')).not.toThrow();
      expect(() => result.current.setAsset('ETH')).not.toThrow();
      expect(() => result.current.setOrderType('limit')).not.toThrow();
      expect(() => result.current.handleMaxAmount()).not.toThrow();
      expect(() => result.current.handleMinAmount()).not.toThrow();
      expect(() => result.current.handlePercentageAmount(0.5)).not.toThrow();
    });

    it('throws error when used outside of provider', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console error for test
        });

      expect(() => {
        renderHook(() => usePerpsOrderContext());
      }).toThrow(
        'usePerpsOrderContext must be used within a PerpsOrderProvider',
      );

      consoleError.mockRestore();
    });

    it('provides access to calculations methods and data from the hook', () => {
      const { result } = renderHookWithProvider(() => usePerpsOrderContext());

      expect(result.current.maxPossibleAmount).toBe(1000);
    });
  });

  describe('Context Integration', () => {
    it('maintains referential stability for function references', () => {
      const { result, rerender } = renderHookWithProvider(() =>
        usePerpsOrderContext(),
      );

      const initialSetAmount = result.current.setAmount;
      const initialSetLeverage = result.current.setLeverage;

      rerender(() => usePerpsOrderContext());

      // Functions should be the same reference since they come from the mocked hook
      expect(result.current.setAmount).toBe(initialSetAmount);
      expect(result.current.setLeverage).toBe(initialSetLeverage);
    });

    it('works with different initial configurations', () => {
      const configs = [
        { initialAsset: 'BTC', initialDirection: 'long' as const },
        { initialAsset: 'ETH', initialDirection: 'short' as const },
        { initialAsset: 'LINK', initialType: 'limit' as OrderType },
      ];

      configs.forEach((config) => {
        const { result } = renderHookWithProvider(
          () => usePerpsOrderContext(),
          config,
        );

        expect(result.current).toBeDefined();
        expect(result.current.orderForm).toBeDefined();
        expect(mockUsePerpsOrderForm).toHaveBeenCalledWith(
          expect.objectContaining(config),
        );
      });
    });

    it('provides the expected interface matching UsePerpsOrderFormReturn', () => {
      const { result } = renderHookWithProvider(() => usePerpsOrderContext());

      // Verify the interface matches exactly what UsePerpsOrderFormReturn should provide
      const contextResult = result.current;

      expect(contextResult).toHaveProperty('orderForm');
      expect(contextResult).toHaveProperty('updateOrderForm');
      expect(contextResult).toHaveProperty('setAmount');
      expect(contextResult).toHaveProperty('setLeverage');
      expect(contextResult).toHaveProperty('setDirection');
      expect(contextResult).toHaveProperty('setAsset');
      expect(contextResult).toHaveProperty('setTakeProfitPrice');
      expect(contextResult).toHaveProperty('setStopLossPrice');
      expect(contextResult).toHaveProperty('setLimitPrice');
      expect(contextResult).toHaveProperty('setOrderType');
      expect(contextResult).toHaveProperty('handlePercentageAmount');
      expect(contextResult).toHaveProperty('handleMaxAmount');
      expect(contextResult).toHaveProperty('handleMinAmount');

      // Verify types are correct
      expect(typeof contextResult.orderForm).toBe('object');
      expect(typeof contextResult.updateOrderForm).toBe('function');
      expect(typeof contextResult.setAmount).toBe('function');
      expect(typeof contextResult.maxPossibleAmount).toBe('number');
    });
  });
});
