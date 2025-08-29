import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsMarketStats } from './usePerpsMarketStats';
import { CandlePeriod } from '../constants/chartConfig';

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
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  },
}));

import { usePerpsPositionData } from './usePerpsPositionData';
import Engine from '../../../../core/Engine';

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
      openInterest: 987654321,
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
      priceData: mockPriceData.BTC,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.currentPrice).toBe(45000);
    expect(result.current.priceChange24h).toBe(2.5);
    expect(result.current.high24h).toBe('$46,000.00');
    expect(result.current.low24h).toBe('$43,500.00');
    expect(result.current.volume24h).toBe('$1.23B');
    expect(result.current.openInterest).toBe('$987.65M');
    expect(result.current.fundingRate).toBe('1.0000%');
    expect(result.current.fundingCountdown).toMatch(/^\d{2}:\d{2}:\d{2}$/);
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

  it('should calculate funding countdown correctly', () => {
    // Set current time to 7:30:00 UTC (30 minutes before funding)
    const mockDate = new Date('2024-01-01T07:30:00Z');
    jest.setSystemTime(mockDate);

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([mockPriceData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: mockPriceData.BTC,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.fundingCountdown).toBe('00:30:00');
  });

  it('should update funding countdown every second', () => {
    // Set initial time
    const mockDate = new Date('2024-01-01T07:30:00Z');
    jest.setSystemTime(mockDate);

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([mockPriceData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: mockPriceData.BTC,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.fundingCountdown).toBe('00:30:00');

    // Advance time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
      jest.setSystemTime(new Date('2024-01-01T07:30:01Z'));
    });

    expect(result.current.fundingCountdown).toBe('00:29:59');
  });

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
    expect(result.current.priceChange24h).toBe(0);
    expect(result.current.high24h).toBe('$0.00');
    expect(result.current.low24h).toBe('$0.00');
    expect(result.current.volume24h).toBe('$0.00');
    expect(result.current.openInterest).toBe('$0.00');
    expect(result.current.fundingRate).toBe('0.0000%');
    expect(result.current.fundingCountdown).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('should format large numbers correctly', () => {
    const largeNumberPriceData = {
      BTC: {
        ...mockPriceData.BTC,
        volume24h: 12345678901234,
        openInterest: 98765432109876,
      },
    };

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([largeNumberPriceData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: largeNumberPriceData.BTC,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.volume24h).toBe('$12.35T');
    expect(result.current.openInterest).toBe('$98.77T');
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
      priceData: negativeFundingData.BTC,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.fundingRate).toBe('-0.5000%');
  });
});
