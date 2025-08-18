import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceDisplay from './LivePriceDisplay';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPrice, formatPercentage } from '../../utils/formatUtils';

// Mock dependencies
jest.mock('../../hooks/stream');
jest.mock('../../utils/formatUtils');

// Mock the Text component to avoid theme issues
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-shadow
  const Text = ({ children, testID, color, variant, ...props }: any) =>
    ReactActual.createElement(
      RNText,
      { testID, color, variant, ...props },
      children,
    );

  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      BodyMD: 'BodyMD',
      BodySM: 'BodySM',
      BodyLG: 'BodyLG',
    },
    TextColor: {
      Default: 'Default',
      Success: 'Success',
      Error: 'Error',
      Primary: 'Primary',
    },
  };
});

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
        price: '50000',
        percentChange24h: '5.5',
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
        price: '3000',
        percentChange24h: '-2.5',
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="ETH" showChange />);

    expect(getByText('$3000')).toBeTruthy();
    expect(getByText('-2.5%')).toBeTruthy();
  });

  it('should render price without change when showChange is false', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        price: '100',
        percentChange24h: '10',
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
        price: '0.1',
        percentChange24h: '0',
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
        price: '25',
        percentChange24h: '0',
      },
    });

    const { getByTestId } = render(
      <LivePriceDisplay
        symbol="AVAX"
        testID="custom-price"
        variant="BodyLG"
        color="Primary"
      />,
    );

    const priceElement = getByTestId('custom-price');
    expect(priceElement).toBeTruthy();
    expect(priceElement.props.variant).toBe('BodyLG');
    expect(priceElement.props.color).toBe('Primary');
  });

  it('should handle positive price change color', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      UNI: {
        price: '10',
        percentChange24h: '15',
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="UNI" showChange />);

    const changeText = getByText('15%');
    expect(changeText.props.color).toBe('Success');
  });

  it('should handle negative price change color', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      LINK: {
        price: '15',
        percentChange24h: '-8',
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="LINK" showChange />);

    const changeText = getByText('-8%');
    expect(changeText.props.color).toBe('Error');
  });

  it('should handle zero price change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      MATIC: {
        price: '1',
        percentChange24h: '0',
      },
    });

    const { getByText } = render(
      <LivePriceDisplay symbol="MATIC" showChange />,
    );

    const changeText = getByText('0%');
    expect(changeText.props.color).toBe('Success'); // Zero is considered positive
  });

  it('should handle missing percentChange24h', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      DOT: {
        price: '5',
        // percentChange24h is missing
      },
    });

    const { getByText } = render(<LivePriceDisplay symbol="DOT" showChange />);

    expect(getByText('$5')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy(); // Defaults to 0
  });
});
