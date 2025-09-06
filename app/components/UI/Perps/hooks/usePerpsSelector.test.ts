import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsSelector } from './usePerpsSelector';
import type { PerpsControllerState } from '../controllers/PerpsController';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call useSelector with correct state path and selector function', () => {
    // Arrange
    const mockState: PerpsControllerState = {
      isFirstTimeUser: {
        testnet: true,
        mainnet: true,
      },
    } as PerpsControllerState;

    const mockSelector = jest.fn(
      (state) => state?.isFirstTimeUser.mainnet ?? false,
    );
    mockUseSelector.mockImplementation((selectorFn) =>
      selectorFn({
        engine: { backgroundState: { PerpsController: mockState } },
      }),
    );

    // Act
    const { result } = renderHook(() => usePerpsSelector(mockSelector));

    // Assert
    expect(mockUseSelector).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSelector).toHaveBeenCalledWith(mockState);
    expect(result.current).toBe(true);
  });

  it('should pass undefined when PerpsController state is undefined', () => {
    // Arrange
    const mockSelector = jest.fn((state) => state?.isFirstTimeUser ?? false);
    mockUseSelector.mockImplementation((selectorFn) =>
      selectorFn({
        engine: { backgroundState: { PerpsController: undefined } },
      }),
    );

    // Act
    const { result } = renderHook(() => usePerpsSelector(mockSelector));

    // Assert
    expect(mockSelector).toHaveBeenCalledWith(undefined);
    expect(result.current).toBe(false);
  });

  it('should work with different selector functions', () => {
    // Arrange
    const mockState: PerpsControllerState = {
      isFirstTimeUser: {
        testnet: true,
        mainnet: true,
      },
      isEligible: true,
      connectionStatus: 'connected',
      positions: [{ coin: 'ETH' }],
    } as PerpsControllerState;

    mockUseSelector.mockImplementation((selectorFn) =>
      selectorFn({
        engine: { backgroundState: { PerpsController: mockState } },
      }),
    );

    // Test different selectors
    const isFirstTimeUserSelector = (state: PerpsControllerState | undefined) =>
      state?.isFirstTimeUser.mainnet ?? false;
    const isEligibleSelector = (state: PerpsControllerState | undefined) =>
      state?.isEligible ?? false;
    const connectionStatusSelector = (
      state: PerpsControllerState | undefined,
    ) => state?.connectionStatus ?? 'disconnected';
    const positionsCountSelector = (state: PerpsControllerState | undefined) =>
      state?.positions?.length ?? 0;

    // Act & Assert
    const { result: isFirstTimeUserResult } = renderHook(() =>
      usePerpsSelector(isFirstTimeUserSelector),
    );
    expect(isFirstTimeUserResult.current).toBe(true);

    const { result: isEligibleResult } = renderHook(() =>
      usePerpsSelector(isEligibleSelector),
    );
    expect(isEligibleResult.current).toBe(true);

    const { result: connectionStatusResult } = renderHook(() =>
      usePerpsSelector(connectionStatusSelector),
    );
    expect(connectionStatusResult.current).toBe('connected');

    const { result: positionsCountResult } = renderHook(() =>
      usePerpsSelector(positionsCountSelector),
    );
    expect(positionsCountResult.current).toBe(1);
  });

  it('should return computed values from selector functions', () => {
    // Arrange
    const mockState: PerpsControllerState = {
      positions: [
        { coin: 'ETH', size: '1.5' },
        { coin: 'BTC', size: '0.1' },
      ],
    } as PerpsControllerState;

    mockUseSelector.mockImplementation((selectorFn) =>
      selectorFn({
        engine: { backgroundState: { PerpsController: mockState } },
      }),
    );

    const positionCoinsSelector = (state: PerpsControllerState | undefined) =>
      state?.positions?.map((p) => p.coin) ?? [];

    // Act
    const { result } = renderHook(() =>
      usePerpsSelector(positionCoinsSelector),
    );

    // Assert
    expect(result.current).toEqual(['ETH', 'BTC']);
  });

  it('should handle complex nested state selection', () => {
    // Arrange
    const mockState: PerpsControllerState = {
      accountState: {
        totalBalance: '1000.00',
        availableBalance: '750.00',
        marginUsed: '250.00',
      },
    } as PerpsControllerState;

    mockUseSelector.mockImplementation((selectorFn) =>
      selectorFn({
        engine: { backgroundState: { PerpsController: mockState } },
      }),
    );

    const accountBalanceSelector = (
      state: PerpsControllerState | undefined,
    ) => ({
      total: parseFloat(state?.accountState?.totalBalance ?? '0'),
      available: parseFloat(state?.accountState?.availableBalance ?? '0'),
      used: parseFloat(state?.accountState?.marginUsed ?? '0'),
    });

    // Act
    const { result } = renderHook(() =>
      usePerpsSelector(accountBalanceSelector),
    );

    // Assert
    expect(result.current).toEqual({
      total: 1000,
      available: 750,
      used: 250,
    });
  });

  it('should maintain referential stability when selector returns same value', () => {
    // Arrange
    const mockState: PerpsControllerState = {
      isFirstTimeUser: {
        testnet: true,
        mainnet: true,
      },
    } as PerpsControllerState;

    const memoizedSelector = (state: PerpsControllerState | undefined) =>
      state?.isFirstTimeUser.mainnet ?? false;

    mockUseSelector.mockImplementation((selectorFn) => {
      // Simulate Redux selector behavior
      const result = selectorFn({
        engine: { backgroundState: { PerpsController: mockState } },
      });
      return result;
    });

    // Act
    const { result, rerender } = renderHook(() =>
      usePerpsSelector(memoizedSelector),
    );

    const firstResult = result.current;
    rerender({});
    const secondResult = result.current;

    // Assert
    expect(firstResult).toBe(secondResult);
    expect(firstResult).toBe(true);
  });
});
