import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceHeader from './LivePriceHeader';
import { usePerpsLivePrices } from '../../hooks/stream';

// Mock dependencies
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
      positionValue: { fontWeight: '700' },
      priceChange24h: { fontSize: 12 },
    },
    theme: {},
  })),
}));

const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;

describe('LivePriceHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const component = render(<LivePriceHeader symbol="ETH" />);
    expect(component).toBeDefined();
  });

  it('should show placeholders when no price data available', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price data is undefined', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: undefined,
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (zero)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '0',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (negative)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '-100',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (NaN)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: 'invalid',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should render valid price and positive change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '3000',
        percentChange24h: '5.5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$3,000.00')).toBeTruthy();
    expect(getByText('+5.50%')).toBeTruthy();
  });

  it('should render valid price and negative change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '2500',
        percentChange24h: '-3.2',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$2,500.00')).toBeTruthy();
    expect(getByText('-3.20%')).toBeTruthy();
  });

  it('should render valid price and zero change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '2000',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$2,000.00')).toBeTruthy();
    expect(getByText('+0.00%')).toBeTruthy();
  });

  it('should handle different symbols', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        coin: 'SOL',
        price: '100',
        percentChange24h: '2.1',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="SOL" />);
    expect(getByText('$100.00')).toBeTruthy();
    expect(getByText('+2.10%')).toBeTruthy();
  });

  it('should use fallback values when no live data', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(
      <LivePriceHeader
        symbol="ETH"
        fallbackPrice="1500"
        fallbackChange="1.5"
      />,
    );
    expect(getByText('$1,500.00')).toBeTruthy();
    expect(getByText('+1.50%')).toBeTruthy();
  });

  it('should show placeholders when fallback price is invalid', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" fallbackPrice="0" fallbackChange="1.5" />,
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should prefer live data over fallback', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '50000',
        percentChange24h: '3.0',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader
        symbol="BTC"
        fallbackPrice="45000"
        fallbackChange="2.0"
      />,
    );
    expect(getByText('$50,000.00')).toBeTruthy();
    expect(getByText('+3.00%')).toBeTruthy();
  });
});
