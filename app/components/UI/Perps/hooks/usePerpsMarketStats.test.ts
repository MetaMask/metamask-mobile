import { renderHook } from '@testing-library/react-hooks';
import { CandlePeriod } from '../constants/chartConfig';
import { usePerpsMarketStats } from './usePerpsMarketStats';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToPrices: jest.fn(),
    },
  },
}));

// Mock the dependent hooks
jest.mock('./usePerpsPositionData');

// Mock the format utils
jest.mock('../utils/formatUtils', () => ({
  formatPrice: (price: number) =>
    `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  formatLargeNumber: (num: number) => {
    if (num >= 1e12) return `${Math.round(num / 1e12)}T`;
    if (num >= 1e9) return `${Math.round(num / 1e9)}B`;
    if (num >= 1e6) return `${Math.round(num / 1e6)}M`;
    return num.toFixed(2);
  },
}));

import Engine from '../../../../core/Engine';
import { usePerpsPositionData } from './usePerpsPositionData';

const mockedUsePerpsPositionData = jest.mocked(usePerpsPositionData);
const mockSubscribeToPrices = Engine.context.PerpsController
  .subscribeToPrices as jest.Mock;

describe('usePerpsMarketStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockPriceData = {
    BTC: {
      coin: 'BTC',
      price: '45000.00',
      timestamp: Date.now(),
      percentChange24h: '2.50',
      funding: 0.01,
      // openInterest is now in USD (already converted from token units * price)
      // For example: 22,000 BTC * $45,000 = $990M
      openInterest: 990000000,
      volume24h: 1234567890,
    },
  };

  const mockCandleData = {
    coin: 'BTC',
    interval: CandlePeriod.ONE_HOUR,
    candles: [
      {
        open: '44000',
        high: '46000',
        low: '43500',
        close: '45000',
        time: 1234567890,
        volume: '1000',
      },
      {
        open: '45000',
        high: '45500',
        low: '44500',
        close: '45200',
        time: 1234567891,
        volume: '1200',
      },
    ],
  };

  it('should return market statistics with correct formatting', () => {
    // Mock the subscription to trigger the callback with price data
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      // Simulate the callback being called with price updates
      callback([mockPriceData.BTC]);
      return jest.fn(); // Return unsubscribe function
    });

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: null,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.currentPrice).toBe(45000);
    expect(result.current.high24h).toBe('$46,000.00');
    expect(result.current.low24h).toBe('$43,500.00');
    expect(result.current.volume24h).toBe('$1B'); // No decimals in formatVolume
    expect(result.current.openInterest).toBe('$990M'); // No decimals in formatLargeNumber
    expect(result.current.fundingRate).toBe('1.0000%');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle loading state correctly', () => {
    // Mock subscription but don't call the callback (simulating no data yet)
    mockSubscribeToPrices.mockImplementation(() => jest.fn());

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: null,
      priceData: null,
      isLoadingHistory: true,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentPrice).toBe(0);
  });

  // Funding countdown tests removed - handled by separate component

  it('should handle no market data gracefully', () => {
    mockSubscribeToPrices.mockImplementation(() => jest.fn());

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: null,
      priceData: null,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.currentPrice).toBe(0);
    expect(result.current.high24h).toBe('$0.00');
    expect(result.current.low24h).toBe('$0.00');
    expect(result.current.volume24h).toBe('$0.00');
    expect(result.current.openInterest).toBe('$0.00');
    expect(result.current.fundingRate).toBe('0.0000%');
  });

  it('should format large numbers correctly', () => {
    const largeNumberPriceData = {
      BTC: {
        ...mockPriceData.BTC,
        volume24h: 12345678901234,
        // openInterest is now in USD (already converted from token units * price)
        openInterest: 99000000000000, // $99T
      },
    };

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([largeNumberPriceData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: null,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.volume24h).toBe('$12T'); // No decimals in formatVolume
    expect(result.current.openInterest).toBe('$99T'); // No decimals in formatLargeNumber
  });

  it('should format negative funding rate correctly', () => {
    const negativeFundingData = {
      BTC: {
        ...mockPriceData.BTC,
        funding: -0.005,
      },
    };

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([negativeFundingData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: null,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.fundingRate).toBe('-0.5000%');
  });
});
