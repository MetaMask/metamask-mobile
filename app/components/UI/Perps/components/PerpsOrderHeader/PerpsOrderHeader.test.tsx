import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PerpsOrderHeader from './PerpsOrderHeader';
import { PerpsOrderHeaderSelectorsIDs } from '../../Perps.testIds';
import { usePerpsLiveHeaderPrice } from '../../hooks/stream';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('../../providers/PerpsStreamManager');

jest.mock('../../hooks/stream', () => ({
  // LivePriceHeader's own internal subscription, used only when a caller
  // doesn't supply a percentChange24h override (not the case for
  // PerpsOrderHeader, which always provides one via usePerpsLiveHeaderPrice).
  usePerpsLivePrices: jest.fn(() => ({})),
  // Used by PerpsOrderHeader itself for the displayed price + 24h change
  // (candle-derived price, unthrottled — see usePerpsLiveHeaderPrice).
  usePerpsLiveHeaderPrice: jest.fn(() => ({
    price: undefined,
    percentChange24h: null,
  })),
}));

const mockUsePerpsLiveHeaderPrice =
  usePerpsLiveHeaderPrice as jest.MockedFunction<
    typeof usePerpsLiveHeaderPrice
  >;

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
    // No live price by default (falls back to the `price` prop), but a
    // valid percent change so existing "+2.50%" assertions keep working.
    // Tests that exercise the candle-derived price source override this
    // explicitly.
    mockUsePerpsLiveHeaderPrice.mockReturnValue({
      price: undefined,
      percentChange24h: 2.5,
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

  describe('Live price subscription (decoupled from parent price prop)', () => {
    it('renders the price prop before the candle-derived price has arrived', () => {
      // Simulates the very first render, before usePerpsLiveHeaderPrice's
      // underlying candle subscription has delivered any data yet.
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: undefined,
        percentChange24h: null,
      });

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,000')).toBeTruthy();
    });

    it('shows the candle-derived live price instead of a stale price prop', () => {
      // Simulates a parent (PerpsOrderView / PerpsClosePositionView) that
      // hasn't re-rendered with a fresh `price` prop yet (e.g. because it is
      // busy recomputing fees/margin/validation), while the header's own
      // independent, unthrottled candle subscription has already received a
      // newer price. The header must reflect the live price, not the stale
      // prop, so it stays as responsive as the market details page (which
      // gets its speed from the same candle-derived data source).
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3123.45,
        percentChange24h: 2.5,
      });

      const { getByText, queryByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,123.4')).toBeTruthy();
      expect(queryByText('$3,000')).toBeNull();
    });

    it('updates the displayed price on every candle tick without a new price prop', () => {
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3050,
        percentChange24h: 2.5,
      });

      const { getByText, queryByText, rerender } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );
      expect(getByText('$3,050')).toBeTruthy();

      // A second candle tick arrives; the `price` prop from the parent is
      // still the original stale value (parent hasn't re-rendered), yet the
      // header should pick up the newest live value.
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3075,
        percentChange24h: 2.5,
      });
      rerender(<PerpsOrderHeader {...defaultProps} price={3000} />);

      expect(getByText('$3,075')).toBeTruthy();
      expect(queryByText('$3,050')).toBeNull();
      expect(queryByText('$3,000')).toBeNull();
    });

    it('falls back to the price prop when there is no candle-derived price yet', () => {
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: undefined,
        percentChange24h: null,
      });

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,000')).toBeTruthy();
    });

    it('subscribes to the candle-derived price using the asset symbol', () => {
      renderWithProvider(<PerpsOrderHeader {...defaultProps} asset="BTC" />, {
        state: initialState,
      });

      expect(mockUsePerpsLiveHeaderPrice).toHaveBeenCalledWith('BTC');
    });
  });

  describe('Percent change bundled with price in the same hook', () => {
    it('shows the percent change from usePerpsLiveHeaderPrice instead of the priceChange prop', () => {
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3050,
        percentChange24h: -4.25,
      });

      const { getByText, queryByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} priceChange={2.5} />,
        { state: initialState },
      );

      expect(getByText('-4.25%')).toBeTruthy();
      expect(queryByText('+2.50%')).toBeNull();
    });

    it('updates price and percent change together on the same hook tick', () => {
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3050,
        percentChange24h: 1.1,
      });

      const { getByText, queryByText, rerender } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );
      expect(getByText('$3,050')).toBeTruthy();
      expect(getByText('+1.10%')).toBeTruthy();

      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3200,
        percentChange24h: -2.75,
      });
      rerender(<PerpsOrderHeader {...defaultProps} price={3000} />);

      expect(getByText('$3,200')).toBeTruthy();
      expect(getByText('-2.75%')).toBeTruthy();
      expect(queryByText('$3,050')).toBeNull();
      expect(queryByText('+1.10%')).toBeNull();
    });

    it('shows the loading placeholder for percent change while it is null, even with a valid price', () => {
      mockUsePerpsLiveHeaderPrice.mockReturnValue({
        price: 3050,
        percentChange24h: null,
      });

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,050')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });
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
