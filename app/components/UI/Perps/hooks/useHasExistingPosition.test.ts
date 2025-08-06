import { renderHook } from '@testing-library/react-hooks';
import { useHasExistingPosition } from './useHasExistingPosition';
import { usePerpsPositions } from './usePerpsPositions';
import type { Position } from '../controllers/types';

// Mock the usePerpsPositions hook
jest.mock('./usePerpsPositions');

describe('useHasExistingPosition', () => {
  const mockUsePerpsPositions = usePerpsPositions as jest.MockedFunction<
    typeof usePerpsPositions
  >;

  const mockPositions: Position[] = [
    {
      coin: 'BTC',
      size: '0.5',
      entryPrice: '45000',
      positionValue: '22500',
      unrealizedPnl: '500',
      marginUsed: '2250',
      leverage: {
        type: 'isolated',
        value: 10,
      },
      liquidationPrice: '40500',
      maxLeverage: 50,
      returnOnEquity: '22.22',
      cumulativeFunding: {
        allTime: '50',
        sinceOpen: '30',
        sinceChange: '10',
      },
    },
    {
      coin: 'ETH',
      size: '-1.2',
      entryPrice: '3000',
      positionValue: '3600',
      unrealizedPnl: '-100',
      marginUsed: '720',
      leverage: {
        type: 'isolated',
        value: 5,
      },
      liquidationPrice: '3300',
      maxLeverage: 50,
      returnOnEquity: '-13.89',
      cumulativeFunding: {
        allTime: '20',
        sinceOpen: '15',
        sinceChange: '5',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hasPosition as true when position exists for asset', () => {
    mockUsePerpsPositions.mockReturnValue({
      positions: mockPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(true);
    expect(result.current.existingPosition).toEqual(mockPositions[0]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return hasPosition as false when no position exists for asset', () => {
    mockUsePerpsPositions.mockReturnValue({
      positions: mockPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'SOL' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return loading state correctly', () => {
    mockUsePerpsPositions.mockReturnValue({
      positions: [],
      isLoading: true,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should return error state correctly', () => {
    const errorMessage = 'Failed to load positions';
    mockUsePerpsPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      isRefreshing: false,
      error: errorMessage,
      loadPositions: jest.fn(),
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should pass loadOnMount parameter correctly', () => {
    mockUsePerpsPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    renderHook(() =>
      useHasExistingPosition({ asset: 'BTC', loadOnMount: false }),
    );

    expect(mockUsePerpsPositions).toHaveBeenCalledWith({
      loadOnMount: false,
      refreshOnFocus: true,
    });
  });

  it('should handle empty positions array', () => {
    mockUsePerpsPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
  });

  it('should update when positions change', () => {
    const { result, rerender } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    // Initially no positions
    mockUsePerpsPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    rerender();
    expect(result.current.hasPosition).toBe(false);

    // Update with positions
    mockUsePerpsPositions.mockReturnValue({
      positions: mockPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
    });

    rerender();
    expect(result.current.hasPosition).toBe(true);
    expect(result.current.existingPosition).toEqual(mockPositions[0]);
  });
});
