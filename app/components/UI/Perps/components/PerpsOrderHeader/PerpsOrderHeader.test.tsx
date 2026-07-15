import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PerpsOrderHeader from './PerpsOrderHeader';
import { PerpsOrderHeaderSelectorsIDs } from '../../Perps.testIds';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('../../providers/PerpsStreamManager');

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({
    ETH: { percentChange24h: '2.5' },
  })),
}));

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

const initialState = {
  engine: {
    backgroundState,
  },
};

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
    const component = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} />,
      { state: initialState },
    );
    expect(component).toBeDefined();
  });

  it('should handle navigation back', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} />,
      { state: initialState },
    );
    const backButton = getByTestId(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON);
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should handle custom onBack callback', () => {
    const mockOnBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} onBack={mockOnBack} />,
      { state: initialState },
    );
    const backButton = getByTestId(PerpsOrderHeaderSelectorsIDs.BACK_BUTTON);
    fireEvent.press(backButton);
    expect(mockOnBack).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('should render with valid price and change', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} />,
      { state: initialState },
    );
    expect(getByText('$3,000')).toBeTruthy();
    expect(getByText('+2.50%')).toBeTruthy();
  });

  it('should show placeholders when price is undefined', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader
        asset="ETH"
        price={undefined as unknown as number}
        priceChange={2.5}
        orderType="market"
        onOrderTypePress={mockOnOrderTypePress}
      />,
      { state: initialState },
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is zero', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} price={0} />,
      { state: initialState },
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is negative', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} price={-100} />,
      { state: initialState },
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should render long direction by default', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} />,
      { state: initialState },
    );
    expect(getByText('Long ETH')).toBeTruthy();
  });

  it('should render short direction when specified', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} direction="short" />,
      { state: initialState },
    );
    expect(getByText('Short ETH')).toBeTruthy();
  });

  it('should render custom title when provided', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} title="Custom Title" />,
      { state: initialState },
    );
    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('should render order type button', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} />,
      { state: initialState },
    );
    expect(getByTestId('perps-order-header-order-type-button')).toBeTruthy();
  });

  it('should handle order type press', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} />,
      { state: initialState },
    );
    const orderTypeButton = getByTestId('perps-order-header-order-type-button');
    fireEvent.press(orderTypeButton);
    expect(mockOnOrderTypePress).toHaveBeenCalled();
  });

  it('should not render order type button when orderType is not provided', () => {
    const { queryByTestId } = renderWithProvider(
      <PerpsOrderHeader asset="ETH" price={3000} priceChange={2.5} />,
      { state: initialState },
    );
    expect(queryByTestId('perps-order-header-order-type-button')).toBeNull();
  });

  it('should render Market order type', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} orderType="market" />,
      { state: initialState },
    );
    expect(getByText('Market')).toBeTruthy();
  });

  it('should render Limit order type', () => {
    const { getByText } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} orderType="limit" />,
      { state: initialState },
    );
    expect(getByText('Limit')).toBeTruthy();
  });

  it('should disable order type button when loading', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsOrderHeader {...defaultProps} isLoading />,
      { state: initialState },
    );
    const orderTypeButton = getByTestId('perps-order-header-order-type-button');
    expect(orderTypeButton).toBeDisabled();
  });

  describe('HIP3 Asset Symbol Handling', () => {
    it('should strip hip3 prefix from asset symbol in long direction', () => {
      const { getByText } = renderWithProvider(
        <PerpsOrderHeader
          {...defaultProps}
          asset="hip3:BTC"
          direction="long"
        />,
        { state: initialState },
      );
      expect(getByText('Long BTC')).toBeTruthy();
    });

    it('should strip hip3 prefix from asset symbol in short direction', () => {
      const { getByText } = renderWithProvider(
        <PerpsOrderHeader
          {...defaultProps}
          asset="hip3:ETH"
          direction="short"
        />,
        { state: initialState },
      );
      expect(getByText('Short ETH')).toBeTruthy();
    });

    it('should strip DEX prefix from asset symbol', () => {
      const { getByText } = renderWithProvider(
        <PerpsOrderHeader
          {...defaultProps}
          asset="xyz:TSLA"
          direction="long"
        />,
        { state: initialState },
      );
      expect(getByText('Long TSLA')).toBeTruthy();
    });

    it('should keep regular asset symbols unchanged', () => {
      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} asset="SOL" direction="short" />,
        { state: initialState },
      );
      expect(getByText('Short SOL')).toBeTruthy();
    });

    it('should strip prefix even with custom title not provided', () => {
      const { getByText } = renderWithProvider(
        <PerpsOrderHeader
          {...defaultProps}
          asset="abc:AAPL"
          direction="long"
        />,
        { state: initialState },
      );
      expect(getByText('Long AAPL')).toBeTruthy();
    });
  });
});
