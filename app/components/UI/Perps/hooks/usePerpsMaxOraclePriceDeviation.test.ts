import { renderHook } from '@testing-library/react-native';
import type { PerpsOrderCapabilities } from '@metamask/perps-controller';
import { usePerpsMaxOraclePriceDeviation } from './usePerpsMaxOraclePriceDeviation';
import { usePerpsProvider } from './usePerpsProvider';

jest.mock('./usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

const mockUsePerpsProvider = jest.mocked(usePerpsProvider);

const readyCapabilities = (
  providerId: string,
  maxOraclePriceDeviation?: number,
): PerpsOrderCapabilities =>
  ({
    status: 'ready',
    providerId,
    orderLimits:
      maxOraclePriceDeviation === undefined ? {} : { maxOraclePriceDeviation },
  }) as unknown as PerpsOrderCapabilities;

const mockProvider = (
  activeProvider: string,
  orderCapabilities: PerpsOrderCapabilities | null,
) =>
  mockUsePerpsProvider.mockReturnValue({
    activeProvider,
    orderCapabilities,
  } as unknown as ReturnType<typeof usePerpsProvider>);

describe('usePerpsMaxOraclePriceDeviation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the limit the requested venue reports for the market', () => {
    mockProvider('aggregated', readyCapabilities('hyperliquid', 0.95));

    const { result } = renderHook(() =>
      usePerpsMaxOraclePriceDeviation('BTC', 'hyperliquid'),
    );

    expect(result.current).toBe(0.95);
    expect(mockUsePerpsProvider).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'hyperliquid',
    });
  });

  it('returns undefined when the venue omits the limit', () => {
    mockProvider('aggregated', readyCapabilities('lighter'));

    const { result } = renderHook(() =>
      usePerpsMaxOraclePriceDeviation('BTC', 'lighter'),
    );

    expect(result.current).toBeUndefined();
  });

  it('ignores a limit reported by a different venue than requested', () => {
    mockProvider('aggregated', readyCapabilities('hyperliquid', 0.95));

    const { result } = renderHook(() =>
      usePerpsMaxOraclePriceDeviation('BTC', 'lighter'),
    );

    expect(result.current).toBeUndefined();
  });

  it('uses the active venue when no provider is passed', () => {
    mockProvider('hyperliquid', readyCapabilities('hyperliquid', 0.8));

    const { result } = renderHook(() => usePerpsMaxOraclePriceDeviation('BTC'));

    expect(result.current).toBe(0.8);
  });

  it('returns undefined in aggregated mode when no provider is passed', () => {
    mockProvider('aggregated', readyCapabilities('hyperliquid', 0.95));

    const { result } = renderHook(() => usePerpsMaxOraclePriceDeviation('BTC'));

    expect(result.current).toBeUndefined();
  });

  it('skips the capability request while no market is selected', () => {
    mockProvider('hyperliquid', null);

    const { result } = renderHook(() =>
      usePerpsMaxOraclePriceDeviation(undefined),
    );

    expect(result.current).toBeUndefined();
    expect(mockUsePerpsProvider).toHaveBeenCalledWith(undefined);
  });
});
