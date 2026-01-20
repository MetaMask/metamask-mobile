import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsOrderHeader from './PerpsOrderHeader';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { alternative: '#F2F4F6' },
      border: { muted: '#D6D9DC' },
      text: { default: '#000000' },
      success: { default: '#00C781' },
      error: { default: '#D73A49' },
    },
  })),
}));

jest.mock('../../../../Base/TokenIcon', () => 'TokenIcon');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations = {
      'perps.market.long': 'Long',
      'perps.market.short': 'Short',
      'perps.order.market': 'Market',
      'perps.order.limit': 'Limit',
    };
    return translations[key as keyof typeof translations] || key;
  }),
}));

// Mock ButtonIcon to make it easier to test
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ onPress }: { onPress: () => void }) => (
        <TouchableOpacity testID="back-button" onPress={onPress} />
      ),
      ButtonIconSizes: { Sm: 'sm' },
    };
  },
);

describe('PerpsOrderHeader', () => {
  const mockGoBack = jest.fn();
  const mockOnOrderTypePress = jest.fn();

  const defaultProps = {
    asset: 'ETH',
    price: 3000,
    priceChange: 2.5,
    orderType: 'market' as const,
    onOrderTypePress: mockOnOrderTypePress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
    });
  });

  it('should render without crashing', () => {
    const component = render(<PerpsOrderHeader {...defaultProps} />);
    expect(component).toBeDefined();
  });

  it('should handle navigation back', () => {
    const { getByTestId } = render(<PerpsOrderHeader {...defaultProps} />);
    const backButton = getByTestId(PerpsHomeViewSelectorsIDs.BACK_BUTTON);
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should handle custom onBack callback', () => {
    const mockOnBack = jest.fn();
    const { getByTestId } = render(
      <PerpsOrderHeader {...defaultProps} onBack={mockOnBack} />,
    );
    const backButton = getByTestId(PerpsHomeViewSelectorsIDs.BACK_BUTTON);
    fireEvent.press(backButton);
    expect(mockOnBack).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('should render with valid price and change', () => {
    const { getByText } = render(<PerpsOrderHeader {...defaultProps} />);
    // PRICE_RANGES_UNIVERSAL: 5 sig figs, max 1 decimal for $1k-$10k, trailing zeros removed
    expect(getByText('$3,000')).toBeTruthy();
    expect(getByText('+2.50%')).toBeTruthy();
  });

  it('should show placeholders when price is undefined', () => {
    const { getByText, queryByText } = render(
      <PerpsOrderHeader
        asset="ETH"
        price={undefined as unknown as number}
        priceChange={2.5}
        orderType="market"
        onOrderTypePress={mockOnOrderTypePress}
      />,
    );
    expect(getByText('$---')).toBeTruthy();
    // When price is invalid, percentage change is not rendered at all
    expect(queryByText('--%')).toBeNull();
    expect(queryByText('2.50%')).toBeNull();
  });

  it('should show placeholders when price is zero', () => {
    const { getByText, queryByText } = render(
      <PerpsOrderHeader {...defaultProps} price={0} />,
    );
    expect(getByText('$---')).toBeTruthy();
    // When price is invalid, percentage change is not rendered at all
    expect(queryByText('--%')).toBeNull();
    expect(queryByText('2.50%')).toBeNull();
  });

  it('should show placeholders when price is negative', () => {
    const { getByText, queryByText } = render(
      <PerpsOrderHeader {...defaultProps} price={-100} />,
    );
    expect(getByText('$---')).toBeTruthy();
    // When price is invalid, percentage change is not rendered at all
    expect(queryByText('--%')).toBeNull();
    expect(queryByText('2.50%')).toBeNull();
  });

  it('should render long direction by default', () => {
    const { getByText } = render(<PerpsOrderHeader {...defaultProps} />);
    expect(getByText('Long ETH')).toBeTruthy();
  });

  it('should render short direction when specified', () => {
    const { getByText } = render(
      <PerpsOrderHeader {...defaultProps} direction="short" />,
    );
    expect(getByText('Short ETH')).toBeTruthy();
  });

  it('should render custom title when provided', () => {
    const { getByText } = render(
      <PerpsOrderHeader {...defaultProps} title="Custom Title" />,
    );
    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('should render order type button', () => {
    const { getByTestId } = render(<PerpsOrderHeader {...defaultProps} />);
    expect(getByTestId('perps-order-header-order-type-button')).toBeTruthy();
  });

  it('should handle order type press', () => {
    const { getByTestId } = render(<PerpsOrderHeader {...defaultProps} />);
    const orderTypeButton = getByTestId('perps-order-header-order-type-button');
    fireEvent.press(orderTypeButton);
    expect(mockOnOrderTypePress).toHaveBeenCalled();
  });

  it('should not render order type button when orderType is not provided', () => {
    const { queryByTestId } = render(
      <PerpsOrderHeader asset="ETH" price={3000} priceChange={2.5} />,
    );
    expect(queryByTestId('perps-order-header-order-type-button')).toBeNull();
  });

  it('should render Market order type', () => {
    const { getByText } = render(
      <PerpsOrderHeader {...defaultProps} orderType="market" />,
    );
    expect(getByText('Market')).toBeTruthy();
  });

  it('should render Limit order type', () => {
    const { getByText } = render(
      <PerpsOrderHeader {...defaultProps} orderType="limit" />,
    );
    expect(getByText('Limit')).toBeTruthy();
  });

  it('should disable order type button when loading', () => {
    const { getByTestId } = render(
      <PerpsOrderHeader {...defaultProps} isLoading />,
    );
    const orderTypeButton = getByTestId('perps-order-header-order-type-button');
    expect(orderTypeButton.props.disabled).toBe(true);
  });

  describe('HIP3 Asset Symbol Handling', () => {
    it('should strip hip3 prefix from asset symbol in long direction', () => {
      const { getByText } = render(
        <PerpsOrderHeader
          {...defaultProps}
          asset="hip3:BTC"
          direction="long"
        />,
      );
      expect(getByText('Long BTC')).toBeTruthy();
    });

    it('should strip hip3 prefix from asset symbol in short direction', () => {
      const { getByText } = render(
        <PerpsOrderHeader
          {...defaultProps}
          asset="hip3:ETH"
          direction="short"
        />,
      );
      expect(getByText('Short ETH')).toBeTruthy();
    });

    it('should strip DEX prefix from asset symbol', () => {
      const { getByText } = render(
        <PerpsOrderHeader
          {...defaultProps}
          asset="xyz:TSLA"
          direction="long"
        />,
      );
      expect(getByText('Long TSLA')).toBeTruthy();
    });

    it('should keep regular asset symbols unchanged', () => {
      const { getByText } = render(
        <PerpsOrderHeader {...defaultProps} asset="SOL" direction="short" />,
      );
      expect(getByText('Short SOL')).toBeTruthy();
    });

    it('should strip prefix even with custom title not provided', () => {
      const { getByText } = render(
        <PerpsOrderHeader
          {...defaultProps}
          asset="abc:AAPL"
          direction="long"
        />,
      );
      expect(getByText('Long AAPL')).toBeTruthy();
    });
  });
});
