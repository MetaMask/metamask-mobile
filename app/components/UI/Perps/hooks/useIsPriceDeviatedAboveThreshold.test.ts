/**
 * Unit tests for useIsPriceDeviatedAboveThreshold hook
 */

import { renderHook } from '@testing-library/react-hooks';
import { useIsPriceDeviatedAboveThreshold } from './useIsPriceDeviatedAboveThreshold';
import { usePerpsPrices } from './usePerpsPrices';
import { VALIDATION_THRESHOLDS } from '../constants/perpsConfig';
import type { PriceUpdate } from '../controllers/types';

jest.mock('./usePerpsPrices');

const mockUsePerpsPrices = usePerpsPrices as jest.MockedFunction<
  typeof usePerpsPrices
>;

describe('useIsPriceDeviatedAboveThreshold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isDeviatedAboveThreshold true when deviation exceeds threshold', () => {
    // Threshold is 0.1 (10%), so 11% deviation should trigger
    // Spot price: 100, Perps price: 111 (11% above)
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '111.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when deviation is below threshold', () => {
    // Threshold is 0.1 (10%), so 5% deviation should not trigger
    // Spot price: 100, Perps price: 105 (5% above)
    // Deviation = |105 - 100| / 100 = 0.05 = 5% < 10% threshold
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '105.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    // 5% deviation < 10% threshold, so should be false
    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when deviation equals threshold', () => {
    // Threshold is 0.1 (10%), exactly 10% deviation should not trigger (uses > not >=)
    // Spot price: 100, Perps price: 110 (exactly 10% above)
    // Deviation = |110 - 100| / 100 = 0.10 = 10% = threshold
    // Since we use > (not >=), 0.10 > 0.10 is false
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '110.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    // Exactly 10% deviation, but we use > not >=, so should be false
    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold true when perps price is below spot price by more than threshold', () => {
    // Threshold is 0.1 (10%), so 11% below should trigger
    // Spot price: 100, Perps price: 89 (11% below)
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '89.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when price data is missing', () => {
    mockUsePerpsPrices.mockReturnValue({});

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isDeviatedAboveThreshold false when markPrice is missing', () => {
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '111.00',
        timestamp: Date.now(),
        // markPrice is missing
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when price is missing', () => {
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        markPrice: '100.00',
        timestamp: Date.now(),
        // price is missing
      } as PriceUpdate,
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when symbol is undefined', () => {
    mockUsePerpsPrices.mockReturnValue({});

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold(undefined),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isDeviatedAboveThreshold false when perps price is zero', () => {
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '0',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when spot price is zero', () => {
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '100.00',
        markPrice: '0',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when perps price is negative', () => {
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '-100.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isDeviatedAboveThreshold false when spot price is negative', () => {
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '100.00',
        markPrice: '-100.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles very small price differences correctly', () => {
    // Very small prices with small absolute difference but large percentage
    // Spot price: 0.001, Perps price: 0.0012 (20% above, should trigger)
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '0.0012',
        markPrice: '0.001',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles very large prices correctly', () => {
    // Large prices with large absolute difference
    // Spot price: 100000, Perps price: 111000 (11% above, should trigger)
    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '111000.00',
        markPrice: '100000.00',
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('updates when price data changes', () => {
    // Start with no deviation (5% < 10% threshold)
    let mockPrices = {
      BTC: {
        coin: 'BTC',
        price: '105.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    };

    mockUsePerpsPrices.mockImplementation(() => mockPrices);

    const { result, rerender } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    // 5% deviation < 10% threshold, so should be false
    expect(result.current.isDeviatedAboveThreshold).toBe(false);

    // Update to have deviation above threshold (11% > 10% threshold)
    mockPrices = {
      BTC: {
        coin: 'BTC',
        price: '111.00',
        markPrice: '100.00',
        timestamp: Date.now(),
      },
    };

    rerender();

    // 11% deviation > 10% threshold, so should be true
    expect(result.current.isDeviatedAboveThreshold).toBe(true);
  });

  it('uses correct threshold from VALIDATION_THRESHOLDS', () => {
    const threshold = VALIDATION_THRESHOLDS.PRICE_DEVIATION;

    // Test with price exactly at threshold + epsilon
    const spotPrice = 100;
    const perpsPrice = spotPrice * (1 + threshold + 0.001); // Just above threshold

    mockUsePerpsPrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: perpsPrice.toFixed(2),
        markPrice: spotPrice.toFixed(2),
        timestamp: Date.now(),
      },
    });

    const { result } = renderHook(() =>
      useIsPriceDeviatedAboveThreshold('BTC'),
    );

    expect(result.current.isDeviatedAboveThreshold).toBe(true);
  });

  it('calls usePerpsPrices with correct parameters', () => {
    renderHook(() => useIsPriceDeviatedAboveThreshold('BTC'));

    expect(mockUsePerpsPrices).toHaveBeenCalledWith(['BTC'], {
      includeMarketData: false,
      throttleMs: 1000,
    });
  });

  it('calls usePerpsPrices with empty array when symbol is undefined', () => {
    renderHook(() => useIsPriceDeviatedAboveThreshold(undefined));

    expect(mockUsePerpsPrices).toHaveBeenCalledWith([], {
      includeMarketData: false,
      throttleMs: 1000,
    });
  });
});
