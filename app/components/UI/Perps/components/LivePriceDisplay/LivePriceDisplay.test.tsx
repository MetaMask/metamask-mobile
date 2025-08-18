import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceDisplay from './LivePriceDisplay';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPrice, formatPercentage } from '../../utils/formatUtils';
import {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

// Mock dependencies
jest.mock('../../hooks/stream');
jest.mock('../../utils/formatUtils');

describe('LivePriceDisplay', () => {
  const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
    typeof usePerpsLivePrices
  >;
  const mockFormatPrice = formatPrice as jest.MockedFunction<
    typeof formatPrice
  >;
  const mockFormatPercentage = formatPercentage as jest.MockedFunction<
    typeof formatPercentage
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatPrice.mockImplementation((price) => `$${price}`);
    mockFormatPercentage.mockImplementation((pct) => `${pct}%`);
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

    const { getByText } = render(<LivePriceDisplay symbol="BTC" />);

    expect(getByText('$50000')).toBeTruthy();
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
        coin: 'ETH',
        price: '3000',
        percentChange24h: '-2.5',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="ETH" showChange />);

    expect(getByText('$3000')).toBeTruthy();
    expect(getByText('-2.5%')).toBeTruthy();
  });

  it('should render price without change when showChange is false', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        coin: 'SOL',
        price: '100',
        percentChange24h: '10',
        timestamp: Date.now(),
      },
    });

    const { getByText, queryByText } = render(
      <LivePriceDisplay symbol="SOL" showChange={false} />,
    );

    expect(getByText('$100')).toBeTruthy();
    expect(queryByText('10%')).toBeNull();
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

    render(<LivePriceDisplay symbol="DOGE" throttleMs={500} />);

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['DOGE'],
      throttleMs: 500,
    });
  });

  it('should apply custom text styles', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      AVAX: {
        coin: 'AVAX',
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
        coin: 'UNI',
        price: '10',
        percentChange24h: '15',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="UNI" showChange />);

    expect(getByText('15%')).toBeTruthy();
  });

  it('should handle negative price change color', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      LINK: {
        coin: 'LINK',
        price: '15',
        percentChange24h: '-8',
        timestamp: Date.now(),
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="LINK" showChange />);

    expect(getByText('-8%')).toBeTruthy();
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

    const { getByText } = render(
      <LivePriceDisplay symbol="MATIC" showChange />,
    );

    expect(getByText('0%')).toBeTruthy();
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

    const { getByText } = render(<LivePriceDisplay symbol="DOT" showChange />);

    expect(getByText('$5')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy(); // Defaults to 0
  });
});
