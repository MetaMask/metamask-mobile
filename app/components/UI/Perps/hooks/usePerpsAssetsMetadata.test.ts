import { renderHook, waitFor } from '@testing-library/react-native';
import { usePerpsAssetMetadata } from './usePerpsAssetsMetadata';
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../constants/hyperLiquidConfig';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePerpsAssetMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('returns empty state when assetSymbol is undefined', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePerpsAssetMetadata(undefined));

    // Assert
    expect(result.current.assetUrl).toBe('');
    expect(result.current.error).toBe(null);
    expect(result.current.hasError).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('successfully loads asset URL when fetch succeeds', async () => {
    // Arrange
    const assetSymbol = 'BTC';
    const expectedUrl = `${HYPERLIQUID_ASSET_ICONS_BASE_URL}BTC.svg`;
    mockFetch.mockResolvedValueOnce({ ok: true });

    // Act
    const { result } = renderHook(() => usePerpsAssetMetadata(assetSymbol));

    // Assert
    await waitFor(() => {
      expect(result.current.assetUrl).toBe(expectedUrl);
      expect(result.current.error).toBe(null);
      expect(result.current.hasError).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, { method: 'HEAD' });
  });

  it('handles asset not found error', async () => {
    // Arrange
    const assetSymbol = 'INVALID';
    const expectedUrl = `${HYPERLIQUID_ASSET_ICONS_BASE_URL}INVALID.svg`;
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    // Act
    const { result } = renderHook(() => usePerpsAssetMetadata(assetSymbol));

    // Assert
    await waitFor(() => {
      expect(result.current.assetUrl).toBe('');
      expect(result.current.error).toBe('Asset icon not found');
      expect(result.current.hasError).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, { method: 'HEAD' });
  });

  it('handles network fetch error', async () => {
    // Arrange
    const assetSymbol = 'ETH';
    const expectedUrl = `${HYPERLIQUID_ASSET_ICONS_BASE_URL}ETH.svg`;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Act
    const { result } = renderHook(() => usePerpsAssetMetadata(assetSymbol));

    // Assert
    await waitFor(() => {
      expect(result.current.assetUrl).toBe('');
      expect(result.current.error).toBe('Failed to load asset icon');
      expect(result.current.hasError).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, { method: 'HEAD' });
  });

  it('converts asset symbol to uppercase', async () => {
    // Arrange
    const assetSymbol = 'btc';
    const expectedUrl = `${HYPERLIQUID_ASSET_ICONS_BASE_URL}BTC.svg`;
    mockFetch.mockResolvedValueOnce({ ok: true });

    // Act
    const { result } = renderHook(() => usePerpsAssetMetadata(assetSymbol));

    // Assert
    await waitFor(() => {
      expect(result.current.assetUrl).toBe(expectedUrl);
    });

    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, { method: 'HEAD' });
  });

  it('resets state when assetSymbol changes from valid to undefined', async () => {
    // Arrange
    const assetSymbol = 'BTC';
    mockFetch.mockResolvedValueOnce({ ok: true });
    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string | undefined }) =>
        usePerpsAssetMetadata(symbol),
      { initialProps: { symbol: assetSymbol as string | undefined } },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.assetUrl).toBeTruthy();
    });

    // Act - change to undefined
    rerender({ symbol: undefined });

    // Assert
    expect(result.current.assetUrl).toBe('');
    expect(result.current.error).toBe(null);
    expect(result.current.hasError).toBe(false);
  });
});
