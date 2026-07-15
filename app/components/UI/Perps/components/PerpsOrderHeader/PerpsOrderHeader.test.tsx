import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { type PriceUpdate } from '@metamask/perps-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PerpsOrderHeader from './PerpsOrderHeader';
import { PerpsOrderHeaderSelectorsIDs } from '../../Perps.testIds';
import { usePerpsLiveFocusedPrice } from '../../hooks/stream';

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
  // PerpsOrderHeader, which always provides one via usePerpsLiveFocusedPrice).
  usePerpsLivePrices: jest.fn(() => ({})),
  // Used by PerpsOrderHeader itself for the displayed price + 24h change,
  // via the shared activeAssetCtx focused-price channel (TAT-3334).
  usePerpsLiveFocusedPrice: jest.fn(),
}));

const mockUsePerpsLiveFocusedPrice =
  usePerpsLiveFocusedPrice as jest.MockedFunction<
    typeof usePerpsLiveFocusedPrice
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

/** Builds a full PriceUpdate object, as the real focused-price channel delivers on every tick. */
const buildPriceUpdate = (
  overrides: Partial<PriceUpdate> = {},
): PriceUpdate => ({
  symbol: 'ETH',
  price: '0',
  markPrice: '0',
  percentChange24h: '2.5',
  timestamp: 0,
  isTradable: true,
  ...overrides,
});

describe('PerpsOrderHeader', () => {
  const mockGoBack = jest.fn();
  const mockOnOrderTypePress = jest.fn();

  const defaultProps = {
    asset: 'ETH',
    price: 3000,
    orderType: 'market' as const,
    onOrderTypePress: mockOnOrderTypePress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
    });
    // No usable live price by default (price: '0' fails the finite/positive
    // guard, so the header falls back to the `price` prop), but a valid
    // percent change so existing "+2.50%" assertions keep working. Tests
    // that exercise the focused-price source override this explicitly.
    mockUsePerpsLiveFocusedPrice.mockReturnValue(buildPriceUpdate());
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
      <PerpsOrderHeader asset="ETH" price={3000} />,
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
    it('renders the price prop before the focused price has arrived', () => {
      // Simulates the very first render, before usePerpsLiveFocusedPrice's
      // underlying activeAssetCtx subscription has delivered any data yet.
      mockUsePerpsLiveFocusedPrice.mockReturnValue(undefined);

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,000')).toBeTruthy();
    });

    it('shows the focused-price live price instead of a stale price prop', () => {
      // Simulates a parent (PerpsOrderView / PerpsClosePositionView) that
      // hasn't re-rendered with a fresh `price` prop yet (e.g. because it is
      // busy recomputing fees/margin/validation), while the header's own
      // independent focused-price subscription has already received a newer
      // price. The header must reflect the live price, not the stale prop.
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3123.45' }),
      );

      const { getByText, queryByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,123.4')).toBeTruthy();
      expect(queryByText('$3,000')).toBeNull();
    });

    it('updates the displayed price on every focused-price tick without a new price prop', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3050' }),
      );

      const { getByText, queryByText, rerender } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );
      expect(getByText('$3,050')).toBeTruthy();

      // A second tick arrives; the `price` prop from the parent is still the
      // original stale value (parent hasn't re-rendered), yet the header
      // should pick up the newest live value.
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3075' }),
      );
      rerender(<PerpsOrderHeader {...defaultProps} price={3000} />);

      expect(getByText('$3,075')).toBeTruthy();
      expect(queryByText('$3,050')).toBeNull();
      expect(queryByText('$3,000')).toBeNull();
    });

    it('falls back to the price prop when there is no focused price yet', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(undefined);

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,000')).toBeTruthy();
    });

    it('falls back to the price prop when the focused price is malformed (non-finite)', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: 'not-a-number' }),
      );

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('$3,000')).toBeTruthy();
    });

    it('subscribes to the focused price using the asset symbol', () => {
      renderWithProvider(<PerpsOrderHeader {...defaultProps} asset="BTC" />, {
        state: initialState,
      });

      expect(mockUsePerpsLiveFocusedPrice).toHaveBeenCalledWith({
        symbol: 'BTC',
      });
    });

    it("re-requests the focused price for the new symbol and does not keep the previous symbol's stale price when asset changes", () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ symbol: 'ETH', price: '3123.45' }),
      );

      const { getByText, queryByText, rerender } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} asset="ETH" price={3000} />,
        { state: initialState },
      );
      expect(getByText('$3,123.4')).toBeTruthy();

      // Simulates FocusedPriceStreamChannel resetting to undefined for the
      // render(s) before the new symbol's first tick arrives (verified by
      // usePerpsLiveFocusedPrice.test.ts's own "clears stale price data when
      // the symbol changes" case) — PerpsOrderHeader must not keep showing
      // the previous symbol's price.
      mockUsePerpsLiveFocusedPrice.mockReturnValue(undefined);
      rerender(<PerpsOrderHeader {...defaultProps} asset="BTC" price={4000} />);

      expect(mockUsePerpsLiveFocusedPrice).toHaveBeenLastCalledWith({
        symbol: 'BTC',
      });
      expect(getByText('$4,000')).toBeTruthy();
      expect(queryByText('$3,123.4')).toBeNull();
    });
  });

  describe('Percent change bundled with price in the same hook', () => {
    it('shows the percent change from usePerpsLiveFocusedPrice instead of a stale value', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3050', percentChange24h: '-4.25' }),
      );

      const { getByText, queryByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );

      expect(getByText('-4.25%')).toBeTruthy();
      expect(queryByText('+2.50%')).toBeNull();
    });

    it('updates price and percent change together on the same hook tick', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3050', percentChange24h: '1.1' }),
      );

      const { getByText, queryByText, rerender } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3000} />,
        { state: initialState },
      );
      expect(getByText('$3,050')).toBeTruthy();
      expect(getByText('+1.10%')).toBeTruthy();

      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3200', percentChange24h: '-2.75' }),
      );
      rerender(<PerpsOrderHeader {...defaultProps} price={3000} />);

      expect(getByText('$3,200')).toBeTruthy();
      expect(getByText('-2.75%')).toBeTruthy();
      expect(queryByText('$3,050')).toBeNull();
      expect(queryByText('+1.10%')).toBeNull();
    });

    it('shows the loading placeholder for percent change while there is no focused-price update yet, even with a valid price prop', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(undefined);

      const { getByText } = renderWithProvider(
        <PerpsOrderHeader {...defaultProps} price={3050} />,
        { state: initialState },
      );

      expect(getByText('$3,050')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('returns null percent change when the focused-price update carries a malformed percentage string', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        buildPriceUpdate({ price: '3050', percentChange24h: 'not-a-number' }),
      );

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
