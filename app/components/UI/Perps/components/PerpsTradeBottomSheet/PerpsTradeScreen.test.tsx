import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
  currentPrice: 98.5,
  percentChange24h: 3.02,
  orderType: 'market',
  autoCloseText: 'TP Off, SL Off',
  showAutoClose: true,
  margin: '$3.41',
  amount: '10',
  tokenAmount: '0.11',
  sliderMaximum: 100,
  isAmountDisabled: false,
  isAmountLoading: false,
  isHeaderLoading: false,
  isPayWithLoading: false,
  isMarginLoading: false,
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
  onOrderTypePress: jest.fn(),
  onLimitPricePress: jest.fn(),
  onLimitPriceKeypadChange: jest.fn(),
  onLimitPricePresetPress: jest.fn(),
  onLimitPriceDonePress: jest.fn(),
  onPayWithPress: jest.fn(),
  onMarginInfoPress: jest.fn(),
  showSlippage: true,
  slippageText: 'Est: 0.12% / Max: 3%',
  exceedsMaxSlippage: false,
  onSlippagePress: jest.fn(),
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
    const onOrderTypePress = jest.fn();
    const onMarginInfoPress = jest.fn();
    render(
      <PerpsTradeScreen
        {...defaultProps}
        onOrderTypePress={onOrderTypePress}
        onPayWithPress={onPayWithPress}
        onMarginInfoPress={onMarginInfoPress}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.ORDER_TYPE_BUTTON),
    );
    expect(onOrderTypePress).toHaveBeenCalledTimes(1);

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

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SLIPPAGE_ROW),
    );
    expect(mockNavigateTo).toHaveBeenCalledWith('settings');

    fireEvent.press(screen.getByTestId(PerpsTradeSheetSelectorsIDs.MARGIN_ROW));
    expect(onMarginInfoPress).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText('Market order type')).toBeOnTheScreen();
    expect(screen.getByLabelText('Margin, Isolated, $3.41')).toBeOnTheScreen();
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

  it('opens nested slippage settings from the market order row', () => {
    const onSlippagePress = jest.fn();

    render(
      <PerpsTradeScreen {...defaultProps} onSlippagePress={onSlippagePress} />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SLIPPAGE_ROW),
    );

    expect(onSlippagePress).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).toHaveBeenCalledWith('settings');
  });

  it('hides slippage for limit orders', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        orderType="limit"
        showSlippage={false}
      />,
    );

    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.SLIPPAGE_ROW),
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

  it('propagates an order execution error to the footer', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        errorMessages={[
          { key: 'execution', message: 'Order could not be submitted' },
        ]}
      />,
    );

    expect(screen.getByText('Order could not be submitted')).toBeOnTheScreen();
  });
});
