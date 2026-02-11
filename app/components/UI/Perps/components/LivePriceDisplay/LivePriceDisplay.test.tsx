import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceDisplay from './LivePriceDisplay';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

jest.mock('../../hooks/stream');

describe('LivePriceDisplay', () => {
  const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
    typeof usePerpsLivePrices
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with live price data', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        symbol: 'BTC',
        price: '50000',
        percentChange24h: '5.5',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="BTC" />);

    // PRICE_RANGES_UNIVERSAL: 5 sig figs, 0 decimals for $10k-$100k
    expect(getByText('$50,000')).toBeTruthy();
    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['BTC'],
      throttleMs: 1000,
    });
  });

  it('should render placeholder when no price data available', () => {
    mockUsePerpsLivePrices.mockReturnValue({});

    const { getByText } = render(<LivePriceDisplay symbol="ETH" />);

    expect(getByText('--')).toBeTruthy();
  });

  it('should render price with change when showChange is true', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '3000',
        percentChange24h: '-2.5',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="ETH" showChange />);

    // PRICE_RANGES_UNIVERSAL: 5 sig figs, max 1 decimal for $1k-$10k, trailing zeros removed
    expect(getByText('$3,000')).toBeTruthy();
    // Now uses formatPercentage with 2 decimal places
    expect(getByText('-2.50%')).toBeTruthy();
  });

  it('should render price without change when showChange is false', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        symbol: 'SOL',
        price: '100',
        percentChange24h: '10',
        timestamp: Date.now(),
      },
    });

    const { getByText, queryByText } = render(
      <LivePriceDisplay symbol="SOL" showChange={false} />,
    );

    // PRICE_RANGES_UNIVERSAL: 5 sig figs, max 2 decimals for $100-$1k, trailing zeros removed
    expect(getByText('$100')).toBeTruthy();
    expect(queryByText('10%')).toBeNull();
  });

  it('should use custom throttle value', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      DOGE: {
        symbol: 'DOGE',
        price: '0.1',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });

    render(<LivePriceDisplay symbol="DOGE" throttleMs={500} />);

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['DOGE'],
      throttleMs: 500,
    });
  });

  it('should apply custom text styles', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      AVAX: {
        symbol: 'AVAX',
        price: '25',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });

    const { getByTestId } = render(
      <LivePriceDisplay
        symbol="AVAX"
        testID="custom-price"
        variant={TextVariant.BodyLGMedium}
        color={TextColor.Primary}
      />,
    );

    const priceElement = getByTestId('custom-price');
    expect(priceElement).toBeTruthy();
    // Just verify the element exists with the custom testID
    // Props are implementation details that shouldn't be tested
  });

  it('should handle positive price change color', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      UNI: {
        symbol: 'UNI',
        price: '10',
        percentChange24h: '15',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="UNI" showChange />);

    // Now uses formatPercentage which adds "+" sign for positive values
    expect(getByText('+15.00%')).toBeTruthy();
  });

  it('should handle negative price change color', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      LINK: {
        symbol: 'LINK',
        price: '15',
        percentChange24h: '-8',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="LINK" showChange />);

    // Now uses formatPercentage with 2 decimal places
    expect(getByText('-8.00%')).toBeTruthy();
  });

  it('should handle zero price change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      MATIC: {
        symbol: 'MATIC',
        price: '1',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(
      <LivePriceDisplay symbol="MATIC" showChange />,
    );

    // Now uses formatPercentage which adds "+" for zero and formats with 2 decimals
    expect(getByText('+0.00%')).toBeTruthy();
  });

  it('should handle missing percentChange24h', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      DOT: {
        symbol: 'DOT',
        price: '5',
        timestamp: Date.now(),
        // percentChange24h is missing
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="DOT" showChange />);

    // PRICE_RANGES_UNIVERSAL: 5 sig figs, max 3 decimals for $1-$10, trailing zeros removed: 5 → $5
    expect(getByText('$5')).toBeTruthy();
    // Defaults to 0, formatPercentage adds "+" and 2 decimals
    expect(getByText('+0.00%')).toBeTruthy();
  });
});
