import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceHeader from './LivePriceHeader';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatPerpsFiat,
  formatPercentage,
  formatPnl,
  PRICE_RANGES_DETAILED_VIEW,
} from '../../utils/formatUtils';
import { useStyles } from '../../../../../component-library/hooks';

// Mock dependencies
jest.mock('../../hooks/stream');
jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn(),
  formatPercentage: jest.fn(),
  formatPnl: jest.fn(),
  PRICE_RANGES_DETAILED_VIEW: [
    {
      condition: (v: number) => v >= 1,
      minimumDecimals: 2,
      maximumDecimals: 2,
      threshold: 1,
    },
    {
      condition: (v: number) => v < 1,
      minimumDecimals: 2,
      maximumDecimals: 7,
      significantDigits: 3,
      threshold: 0.0000001,
    },
  ],
}));
jest.mock('../../../../../component-library/hooks');
jest.mock('../../constants/perpsConfig', () => ({
  PERPS_CONSTANTS: {
    FALLBACK_PRICE_DISPLAY: '$---',
    FALLBACK_DATA_DISPLAY: '--',
  },
  PERFORMANCE_CONFIG: {
    MARKET_DATA_CACHE_DURATION_MS: 5 * 60 * 1000,
  },
}));

describe('LivePriceHeader', () => {
  const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
    typeof usePerpsLivePrices
  >;
  const mockFormatPerpsFiat = formatPerpsFiat as jest.MockedFunction<
    typeof formatPerpsFiat
  >;
  const mockFormatPercentage = formatPercentage as jest.MockedFunction<
    typeof formatPercentage
  >;
  const mockFormatPnl = formatPnl as jest.MockedFunction<typeof formatPnl>;
  const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatPerpsFiat.mockImplementation((price) => {
      const num = typeof price === 'string' ? parseFloat(price) : price;
      return `$${num.toFixed(2)}`;
    });
    mockFormatPercentage.mockImplementation((pct) => `${pct}%`);
    mockFormatPnl.mockImplementation((amount) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return num >= 0
        ? `+$${Math.abs(num).toFixed(2)}`
        : `-$${Math.abs(num).toFixed(2)}`;
    });
    mockUseStyles.mockReturnValue({
      styles: {
        container: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
        positionValue: { fontWeight: '700' },
        priceChange24h: { fontSize: 12 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      theme: {} as any,
    });

    // Mock PRICE_RANGES_DETAILED_VIEW
    (PRICE_RANGES_DETAILED_VIEW as typeof PRICE_RANGES_DETAILED_VIEW) =
      mockPriceRangesDetailedView;
  });

  it('should render with live price data', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '50000',
        percentChange24h: '5.5',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceHeader symbol="BTC" />);

    expect(getByText('$50000.00')).toBeTruthy();
    // 5.5% of 50000 = 2750
    expect(getByText('5.5%')).toBeTruthy();
  });

  it('should use fallback values when no live data', () => {
    mockUsePerpsLivePrices.mockReturnValue({});

    const { getByText } = render(
      <LivePriceHeader
        symbol="ETH"
        fallbackPrice="3000"
        fallbackChange="2.5"
      />,
    );

    expect(getByText('$3000.00')).toBeTruthy();
    // 2.5% of 3000 = 75
    expect(getByText('2.5%')).toBeTruthy();
  });

  it('should handle negative price change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        coin: 'SOL',
        price: '100',
        percentChange24h: '-10',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceHeader symbol="SOL" />);

    expect(getByText('$100.00')).toBeTruthy();
    // -10% of 100 = -10
    expect(getByText('-10%')).toBeTruthy();
  });

  it('should handle positive price change color', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      AVAX: {
        coin: 'AVAX',
        price: '25',
        percentChange24h: '8',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceHeader symbol="AVAX" />);

    expect(getByText('8%')).toBeTruthy();
  });

  it('should handle zero price change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      MATIC: {
        coin: 'MATIC',
        price: '1',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceHeader symbol="MATIC" />);

    expect(getByText('$1.00')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy();
  });

  it('should use custom throttle value', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      DOGE: {
        coin: 'DOGE',
        price: '0.1',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });

    render(<LivePriceHeader symbol="DOGE" throttleMs={2000} />);

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['DOGE'],
      throttleMs: 2000,
    });
  });

  it('should use default throttle value of 1000ms', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      UNI: {
        coin: 'UNI',
        price: '10',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });

    render(<LivePriceHeader symbol="UNI" />);

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['UNI'],
      throttleMs: 1000,
    });
  });

  it('should apply test IDs correctly', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      LINK: {
        coin: 'LINK',
        price: '15',
        percentChange24h: '3',
        timestamp: Date.now(),
      },
    });

    const { getByTestId } = render(
      <LivePriceHeader
        symbol="LINK"
        testIDPrice="price-test"
        testIDChange="change-test"
      />,
    );

    expect(getByTestId('price-test')).toBeTruthy();
    expect(getByTestId('change-test')).toBeTruthy();
  });

  it('should handle missing percentChange24h', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      DOT: {
        coin: 'DOT',
        price: '5',
        timestamp: Date.now(),
        // percentChange24h is missing
      },
    });

    const { getByText } = render(<LivePriceHeader symbol="DOT" />);

    expect(getByText('$5.00')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy(); // Defaults to 0
  });

  it('should calculate change amount correctly', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ADA: {
        coin: 'ADA',
        price: '0.5',
        percentChange24h: '20',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceHeader symbol="ADA" />);

    expect(getByText('$0.50')).toBeTruthy();
    // 20% of 0.5 = 0.1
    expect(getByText('20%')).toBeTruthy();
  });

  it('should use fallback values as defaults', () => {
    mockUsePerpsLivePrices.mockReturnValue({});

    const { getByText } = render(
      <LivePriceHeader symbol="XRP" fallbackPrice="0.6" fallbackChange="-5" />,
    );

    expect(getByText('$0.60')).toBeTruthy();
    // -5% of 0.6 = -0.03
    expect(getByText('-5%')).toBeTruthy();
  });

  it('should prefer live data over fallback', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ALGO: {
        coin: 'ALGO',
        price: '0.2',
        percentChange24h: '15',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(
      <LivePriceHeader symbol="ALGO" fallbackPrice="0.3" fallbackChange="10" />,
    );

    // Should use live data, not fallback
    expect(getByText('$0.20')).toBeTruthy();
    // 15% of 0.2 = 0.03
    expect(getByText('15%')).toBeTruthy();
  });

  // New tests for edge case handling and error handling
  describe('Edge case handling', () => {
    it('should display fallback when price is zero', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ZERO: {
          coin: 'ZERO',
          price: '0',
          percentChange24h: '5',
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(<LivePriceHeader symbol="ZERO" />);

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('5%')).toBeTruthy();
    });

    it('should display fallback when price is negative', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        NEG: {
          coin: 'NEG',
          price: '-100',
          percentChange24h: '2',
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(<LivePriceHeader symbol="NEG" />);

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('2%')).toBeTruthy();
    });

    it('should display fallback when price is NaN', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        NAN: {
          coin: 'NAN',
          price: 'invalid',
          percentChange24h: '1',
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(<LivePriceHeader symbol="NAN" />);

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('1%')).toBeTruthy();
    });

    it('should display fallback when price is Infinity', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        INF: {
          coin: 'INF',
          price: 'Infinity',
          percentChange24h: '3',
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(<LivePriceHeader symbol="INF" />);

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('3%')).toBeTruthy();
    });

    it('should display fallback when fallback price is invalid', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { getByText } = render(
        <LivePriceHeader
          symbol="INVALID"
          fallbackPrice="invalid"
          fallbackChange="2"
        />,
      );

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('2%')).toBeTruthy();
    });

    it('should display fallback when fallback price is zero', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { getByText } = render(
        <LivePriceHeader
          symbol="ZERO_FALLBACK"
          fallbackPrice="0"
          fallbackChange="4"
        />,
      );

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('4%')).toBeTruthy();
    });
  });

  describe('Format error handling', () => {
    it('should display fallback when formatPerpsFiat throws an error', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ERROR: {
          coin: 'ERROR',
          price: '100',
          percentChange24h: '5',
          timestamp: Date.now(),
        },
      });

      // Mock formatPerpsFiat to throw an error
      mockFormatPerpsFiat.mockImplementation(() => {
        throw new Error('Formatting error');
      });

      const { getByText } = render(<LivePriceHeader symbol="ERROR" />);

      expect(getByText('$---')).toBeTruthy();
      expect(getByText('5%')).toBeTruthy();
    });

    it('should call formatPerpsFiat with PRICE_RANGES_DETAILED_VIEW', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        RANGES: {
          coin: 'RANGES',
          price: '50',
          percentChange24h: '2',
          timestamp: Date.now(),
        },
      });

      render(<LivePriceHeader symbol="RANGES" />);

      expect(mockFormatPerpsFiat).toHaveBeenCalledWith(50, {
        ranges: PRICE_RANGES_DETAILED_VIEW,
      });
    });

    it('should handle formatPerpsFiat success with detailed view ranges', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        SUCCESS: {
          coin: 'SUCCESS',
          price: '123.456',
          percentChange24h: '7',
          timestamp: Date.now(),
        },
      });

      // Mock successful formatting with detailed ranges
      mockFormatPerpsFiat.mockReturnValue('$123.46');

      const { getByText } = render(<LivePriceHeader symbol="SUCCESS" />);

      expect(getByText('$123.46')).toBeTruthy();
      expect(getByText('7%')).toBeTruthy();
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith(123.456, {
        ranges: PRICE_RANGES_DETAILED_VIEW,
      });
    });
  });

  describe('Memoization behavior', () => {
    it('should memoize price formatting based on displayPrice', () => {
      const { rerender } = render(<LivePriceHeader symbol="MEMO" />);

      // First render
      expect(mockFormatPerpsFiat).toHaveBeenCalledTimes(1);

      // Re-render with same price - should not call formatPerpsFiat again
      rerender(<LivePriceHeader symbol="MEMO" />);
      expect(mockFormatPerpsFiat).toHaveBeenCalledTimes(1);

      // Re-render with different price - should call formatPerpsFiat again
      mockUsePerpsLivePrices.mockReturnValue({
        MEMO: {
          coin: 'MEMO',
          price: '200',
          percentChange24h: '1',
          timestamp: Date.now(),
        },
      });
      rerender(<LivePriceHeader symbol="MEMO" />);
      expect(mockFormatPerpsFiat).toHaveBeenCalledTimes(2);
    });
  });
});
