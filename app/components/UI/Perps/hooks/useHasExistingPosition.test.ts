import { renderHook } from '@testing-library/react-hooks';
import { useHasExistingPosition } from './useHasExistingPosition';
import { usePerpsLivePositions } from './stream';
import type { Position } from '../controllers/types';

// Mock the usePerpsLivePositions hook
jest.mock('./stream', () => ({
  usePerpsLivePositions: jest.fn(),
}));

describe('useHasExistingPosition', () => {
  const mockUsePerpsLivePositions =
    usePerpsLivePositions as jest.MockedFunction<typeof usePerpsLivePositions>;

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
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
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
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'SOL' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return loading state as false (WebSocket loads from cache)', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false); // Always false with WebSocket
    expect(result.current.error).toBe(null);
  });

  it('should return error as null (WebSocket handles errors internally)', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null); // Always null with WebSocket
  });

  it('should ignore loadOnMount parameter (WebSocket loads from cache)', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC', loadOnMount: false }),
    );

    // loadOnMount is ignored in WebSocket implementation
    expect(result.current.hasPosition).toBe(false);
  });

  it('should handle empty positions array', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
  });

  it('should update when positions change', () => {
    // Initially no positions
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result, rerender } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);

    // Update with positions
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    rerender();
    expect(result.current.hasPosition).toBe(true);
    expect(result.current.existingPosition).toEqual(mockPositions[0]);
  });

  it('should return a no-op refreshPosition function', async () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    // refreshPosition should be a no-op that returns a resolved promise
    await expect(result.current.refreshPosition()).resolves.toBeUndefined();
  });
});
