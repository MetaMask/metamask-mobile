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

  // Shared test data
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

  it('formats and displays all market statistics when data is available', () => {
    // Arrange: Set up market data with funding, volume, and open interest
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([mockPriceData.BTC]);
      return jest.fn();
    });
    mockedUsePerpsPositionData.mockReturnValue({
      candleData: mockCandleData,
      priceData: null,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    // Act: Render the hook with a symbol
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: All market statistics are correctly formatted
    expect(result.current.currentPrice).toBe(45000);
    expect(result.current.high24h).toBe('$46,000.00');
    expect(result.current.low24h).toBe('$43,500.00');
    expect(result.current.volume24h).toBe('$1.23B');
    expect(result.current.openInterest).toBe('$990.00M');
    expect(result.current.fundingRate).toBe('1.0000%');
    expect(result.current.isLoading).toBe(false);
  });

  it('indicates loading state when candle data is not yet available', () => {
    // Arrange: Set up state with no candle data
    mockSubscribeToPrices.mockImplementation(() => jest.fn());
    mockedUsePerpsPositionData.mockReturnValue({
      candleData: null,
      priceData: null,
      isLoadingHistory: true,
      refreshCandleData: jest.fn(),
    });

    // Act: Render the hook
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: Loading state is true and default values are shown
    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentPrice).toBe(0);
  });

  it('displays default values when no market data is available', () => {
    // Arrange: Set up empty market data state
    mockSubscribeToPrices.mockImplementation(() => jest.fn());
    mockedUsePerpsPositionData.mockReturnValue({
      candleData: null,
      priceData: null,
      isLoadingHistory: false,
      refreshCandleData: jest.fn(),
    });

    // Act: Render the hook
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: All values show appropriate defaults
    expect(result.current.currentPrice).toBe(0);
    expect(result.current.high24h).toBe('$0.00');
    expect(result.current.low24h).toBe('$0.00');
    expect(result.current.volume24h).toBe('$0.00');
    expect(result.current.openInterest).toBe('$0.00');
    expect(result.current.fundingRate).toBe('0.0000%');
  });

  it('formats extremely large numbers with appropriate suffixes', () => {
    // Given market data with very large volume and open interest values
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

    expect(result.current.volume24h).toBe('$12.35T'); // Decimals in formatVolume for detailed view
    expect(result.current.openInterest).toBe('$99.00T'); // Decimals in formatLargeNumber for detailed view
  });

  it('formats negative funding rates with proper sign and decimals', () => {
    // Given a negative funding rate
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
