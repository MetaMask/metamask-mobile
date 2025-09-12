import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceHeader from './LivePriceHeader';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatPerpsFiat,
  formatPercentage,
  formatPnl,
} from '../../utils/formatUtils';
import { useStyles } from '../../../../../component-library/hooks';

// Mock dependencies
jest.mock('../../hooks/stream');
jest.mock('../../utils/formatUtils');
jest.mock('../../../../../component-library/hooks');

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
    expect(getByText('+$2750.00')).toBeTruthy();
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
    expect(getByText('+$75.00')).toBeTruthy();
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
    expect(getByText('-$10.00')).toBeTruthy();
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

    expect(getByText('+$2.00')).toBeTruthy();
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
    expect(getByText('+$0.00')).toBeTruthy();
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
    expect(getByText('+$0.00')).toBeTruthy(); // Defaults to 0
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
    expect(getByText('+$0.10')).toBeTruthy();
  });

  it('should use fallback values as defaults', () => {
    mockUsePerpsLivePrices.mockReturnValue({});

    const { getByText } = render(
      <LivePriceHeader symbol="XRP" fallbackPrice="0.6" fallbackChange="-5" />,
    );

    expect(getByText('$0.60')).toBeTruthy();
    // -5% of 0.6 = -0.03
    expect(getByText('-$0.03')).toBeTruthy();
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
    expect(getByText('+$0.03')).toBeTruthy();
  });
});
