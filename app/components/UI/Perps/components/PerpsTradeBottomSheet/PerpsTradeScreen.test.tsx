import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import PerpsTradeScreen from './PerpsTradeScreen';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

const mockNavigateTo = jest.fn();
let mockLivePriceHeaderProps:
  | { currentPrice: number; percentChange24h: number | null }
  | undefined;
let mockPerpsTokenLogoProps: { symbol: string; size: number } | undefined;

jest.mock('./PerpsTradeBottomSheet', () => ({
  PerpsTradeSheetTitleBanner: () => null,
  usePerpsTradeSheet: () => ({
    navigateTo: mockNavigateTo,
    title: undefined,
    banner: undefined,
  }),
}));

jest.mock('../PerpsSlider', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../PerpsOICapWarning', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../PerpsServiceInterruptionBanner', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../PerpsTokenLogo', () => ({
  __esModule: true,
  default: (props: { symbol: string; size: number }) => {
    mockPerpsTokenLogoProps = props;
    return null;
  },
}));

jest.mock('../LivePriceDisplay/LivePriceHeader', () => ({
  __esModule: true,
  default: (props: {
    currentPrice: number;
    percentChange24h: number | null;
  }) => {
    mockLivePriceHeaderProps = props;
    return null;
  },
}));

const defaultProps: React.ComponentProps<typeof PerpsTradeScreen> = {
  asset: 'SOL',
  oiCapSymbol: 'SOL',
  direction: 'long',
  leverage: 3,
  maxLeverage: 40,
  currentPrice: 98.5,
  percentChange24h: 3.02,
  orderType: 'market',
  autoCloseText: 'TP Off, SL Off',
  showAutoClose: true,
  margin: '$3.41',
  liquidationPrice: '$68.29',
  liquidationDistance: '30.05%',
  amount: '10',
  tokenAmount: '0.11',
  sliderMaximum: 100,
  isAmountDisabled: false,
  isAmountLoading: false,
  isHeaderLoading: false,
  isPayWithLoading: false,
  isMarginLoading: false,
  isLiquidationLoading: false,
  isFeeLoading: false,
  isOrderTypeDisabled: false,
  areLimitPricePresetsDisabled: false,
  hasAmountError: false,
  showAmountWarning: false,
  isInputFocused: false,
  isLimitPriceFocused: false,
  payWithName: 'Perps balance',
  payWithBalance: '$1,285.82',
  showPayWith: true,
  isPayWithDisabled: false,
  feePercentage: '0.143',
  isSubmitting: false,
  isSubmitDisabled: false,
  errorMessages: [],
  isAtOICap: false,
  showServiceInterruptionBanner: false,
  onAmountPress: jest.fn(),
  onSliderValueChange: jest.fn(),
  onSliderDragEnd: jest.fn(),
  onKeypadChange: jest.fn(),
  onPercentagePress: jest.fn(),
  onMaxPress: jest.fn(),
  onDonePress: jest.fn(),
  onOrderTypeToggle: jest.fn(),
  onLimitPricePress: jest.fn(),
  onLimitPriceKeypadChange: jest.fn(),
  onLimitPricePresetPress: jest.fn(),
  onLimitPriceDonePress: jest.fn(),
  onPayWithPress: jest.fn(),
  onSubmit: jest.fn(),
};

describe('PerpsTradeScreen errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLivePriceHeaderProps = undefined;
    mockPerpsTokenLogoProps = undefined;
  });

  it('propagates every form error to an accessible alert', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        hasAmountError
        isSubmitDisabled
        errorMessages={[
          { key: 'minimum', message: 'Minimum order is $10' },
          { key: 'quote', message: 'No payment quote available' },
        ]}
      />,
    );

    expect(
      screen.getByRole('alert', { name: 'Minimum order is $10' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('alert', { name: 'No payment quote available' }),
    ).toBeOnTheScreen();
  });

  it('wires primary Trade actions to the sheet and order handlers', () => {
    const onSubmit = jest.fn();
    const onPayWithPress = jest.fn();
    const onOrderTypeToggle = jest.fn();
    render(
      <PerpsTradeScreen
        {...defaultProps}
        onOrderTypeToggle={onOrderTypeToggle}
        onPayWithPress={onPayWithPress}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.ORDER_TYPE_BUTTON),
    );
    expect(onOrderTypeToggle).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LEVERAGE_ROW),
    );
    expect(mockNavigateTo).toHaveBeenCalledWith('leverage');

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PAY_WITH_ROW),
    );
    expect(onPayWithPress).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.AUTO_CLOSE_ROW),
    );
    expect(mockNavigateTo).toHaveBeenCalledWith('tpsl');

    fireEvent.press(screen.getByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_ROW));
    expect(mockNavigateTo).toHaveBeenCalledWith('marginInfo');

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_ROW),
    );
    expect(mockNavigateTo).toHaveBeenCalledWith('liquidationInfo');

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText('Market order type')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Margin, Isolated, $3.41. About margin'),
    ).toBeOnTheScreen();
  });

  it('shows the market maximum leverage in the header, not the selected one', () => {
    render(
      <PerpsTradeScreen {...defaultProps} leverage={3} maxLeverage={40} />,
    );

    // `getByText` only matches host <Text> nodes, so this also guards against
    // the label being emitted as bare strings inside the Tag's <View>, which
    // React Native does not draw.
    expect(
      within(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.MAX_LEVERAGE_TAG),
      ).getByText('40x'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Up to 40x leverage')).toBeOnTheScreen();
    // The selected leverage still lives in the Leverage row.
    expect(screen.getByLabelText('Leverage, 3x')).toBeOnTheScreen();
  });

  it('omits the max leverage tag until market data resolves', () => {
    render(<PerpsTradeScreen {...defaultProps} maxLeverage={null} />);

    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.MAX_LEVERAGE_TAG),
    ).not.toBeOnTheScreen();
  });

  it('shows the liquidation price with its distance and a trend icon', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        liquidationPrice="$68.29"
        liquidationDistance="30.05%"
      />,
    );

    // Value IDs let device recipes read the numbers without parsing the row's
    // accessibility label.
    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE),
    ).toHaveTextContent('$68.29');
    expect(
      screen.getByTestId(
        PerpsTradeSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
      ),
    ).toHaveTextContent('30.05%');
    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_TREND_ICON),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Liquidation price, $68.29, 30.05%. About liquidation price',
      ),
    ).toBeOnTheScreen();
  });

  it('shows only the fallback when no liquidation price is available', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        liquidationPrice="--"
        liquidationDistance={undefined}
      />,
    );

    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE),
    ).toHaveTextContent('--');
    expect(
      screen.queryByTestId(
        PerpsTradeSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_TREND_ICON),
    ).not.toBeOnTheScreen();
  });

  it('draws the Figma swap glyph in the fiat/token toggle', () => {
    render(<PerpsTradeScreen {...defaultProps} />);

    const toggle = screen.getByTestId(
      PerpsTradeSheetSelectorsIDs.AMOUNT_TOGGLE,
    );

    expect(within(toggle).getByTestId('perps-swap-icon')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Show asset value' }),
    ).toBeOnTheScreen();
  });

  it('never shows a slippage row in the Trade sheet', () => {
    render(<PerpsTradeScreen {...defaultProps} />);

    expect(screen.queryByText('Slippage')).not.toBeOnTheScreen();
  });

  it('opens Auto close for a limit order that has no limit price yet', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        limitPrice={undefined}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.AUTO_CLOSE_ROW),
    );

    expect(mockNavigateTo).toHaveBeenCalledWith('tpsl');
  });

  it('hides Auto close when TP/SL is unavailable for the order flow', () => {
    render(<PerpsTradeScreen {...defaultProps} showAutoClose={false} />);

    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.AUTO_CLOSE_ROW),
    ).not.toBeOnTheScreen();
  });

  it('hides the order CTA while the market is at its OI cap', () => {
    render(<PerpsTradeScreen {...defaultProps} isAtOICap />);

    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides Pay With when token payments are unavailable', () => {
    render(<PerpsTradeScreen {...defaultProps} showPayWith={false} />);

    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.PAY_WITH_ROW),
    ).not.toBeOnTheScreen();
  });

  it('passes coherent live market data to the compact header', () => {
    render(
      <PerpsTradeScreen {...defaultProps} asset="PEPE" oiCapSymbol="kPEPE" />,
    );

    expect(mockLivePriceHeaderProps).toEqual(
      expect.objectContaining({
        currentPrice: 98.5,
        percentChange24h: 3.02,
      }),
    );
    expect(mockPerpsTokenLogoProps).toEqual({
      symbol: 'kPEPE',
      size: 32,
    });
  });

  it('renders skeletons for unresolved dynamic values', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        isHeaderLoading
        isPayWithLoading
        isMarginLoading
        isLiquidationLoading
        isFeeLoading
      />,
    );

    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.HEADER_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PAY_WITH_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.FEE_SKELETON),
    ).toBeOnTheScreen();
  });

  it('shows the limit price row for a limit order', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        limitPrice="98.50"
      />,
    );

    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_ROW),
    ).toBeOnTheScreen();
    expect(screen.getByText('$98.5')).toBeOnTheScreen();
  });

  it('prompts for an unset limit price instead of displaying a zero price', () => {
    render(<PerpsTradeScreen {...defaultProps} orderType="limit" />);

    expect(screen.getByText('Set price')).toBeOnTheScreen();
    expect(screen.queryByText('$0.00')).not.toBeOnTheScreen();
  });

  it('shows a limit-price crossing warning', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        limitPrice="100"
        limitPriceWarning="This order will execute immediately."
      />,
    );

    expect(
      screen.getByRole('alert', {
        name: 'This order will execute immediately.',
      }),
    ).toBeOnTheScreen();
  });

  it('disables Pay With for hardware accounts', () => {
    const onPayWithPress = jest.fn();
    render(
      <PerpsTradeScreen
        {...defaultProps}
        isPayWithDisabled
        onPayWithPress={onPayWithPress}
      />,
    );

    const payWithRow = screen.getByTestId(
      PerpsTradeSheetSelectorsIDs.PAY_WITH_ROW,
    );
    expect(payWithRow.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(payWithRow);
    expect(onPayWithPress).not.toHaveBeenCalled();
  });

  it('shows the reused keypad while editing a limit price', () => {
    const onLimitPriceDonePress = jest.fn();
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        isLimitPriceFocused
        onLimitPriceDonePress={onLimitPriceDonePress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.KEYPAD_DONE_BUTTON),
    );

    expect(onLimitPriceDonePress).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('preserves in-progress limit price input while editing', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        limitPrice="98.50"
        isLimitPriceFocused
      />,
    );

    expect(screen.getByText('$98.50')).toBeOnTheScreen();
    expect(screen.queryByText('$98.5')).not.toBeOnTheScreen();
  });

  it.each([
    ['LIMIT_PRICE_PRESET_MID', 'mid'],
    ['LIMIT_PRICE_PRESET_BOOK', 'book'],
    ['LIMIT_PRICE_PRESET_PERCENTAGE_1', 'percentage-1'],
    ['LIMIT_PRICE_PRESET_PERCENTAGE_2', 'percentage-2'],
  ] as const)('applies the %s quick pick', (selector, preset) => {
    const onLimitPricePresetPress = jest.fn();
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        isLimitPriceFocused
        onLimitPricePresetPress={onLimitPricePresetPress}
      />,
    );

    fireEvent.press(screen.getByTestId(PerpsTradeSheetSelectorsIDs[selector]));

    expect(onLimitPricePresetPress).toHaveBeenCalledWith(preset);
  });

  it('tightens the padding of the five-button limit price preset row so labels are not clipped', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        isLimitPriceFocused
      />,
    );

    const doneButton = screen.getByTestId(
      PerpsTradeSheetSelectorsIDs.KEYPAD_DONE_BUTTON,
    );
    const midButton = screen.getByTestId(
      PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_PRESET_MID,
    );

    // The design system button applies `px-4` by default; the override must
    // win so five buttons fit their labels side by side.
    [doneButton, midButton].forEach((button) => {
      const style = StyleSheet.flatten(button.props.style);
      expect(style).toMatchObject({ flexGrow: 1 });
      expect(style.paddingLeft ?? style.paddingHorizontal).toBe(4);
    });
  });
});
