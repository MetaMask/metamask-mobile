import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsTradeScreen from './PerpsTradeScreen';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

const mockNavigateTo = jest.fn();
const mockClose = jest.fn();

jest.mock('./PerpsTradeBottomSheet', () => ({
  PerpsTradeSheetTitleBanner: () => null,
  usePerpsTradeSheet: () => ({
    navigateTo: mockNavigateTo,
    close: mockClose,
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

const defaultProps: React.ComponentProps<typeof PerpsTradeScreen> = {
  asset: 'SOL',
  oiCapSymbol: 'SOL',
  direction: 'long',
  leverage: 3,
  orderType: 'market',
  autoCloseText: 'TP Off, SL Off',
  margin: '$3.41',
  amount: '10',
  tokenAmount: '0.11',
  sliderMaximum: 100,
  isAmountDisabled: false,
  isAmountLoading: false,
  hasAmountError: false,
  showAmountWarning: false,
  isInputFocused: false,
  isLimitPriceFocused: false,
  payWithName: 'Perps balance',
  payWithBalance: '$1,285.82',
  showPayWith: true,
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
  onAutoClosePress: jest.fn(),
  onPayWithPress: jest.fn(),
  onSubmit: jest.fn(),
};

describe('PerpsTradeScreen errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const onAutoClosePress = jest.fn();
    render(
      <PerpsTradeScreen
        {...defaultProps}
        onOrderTypePress={onOrderTypePress}
        onAutoClosePress={onAutoClosePress}
        onPayWithPress={onPayWithPress}
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
    expect(onAutoClosePress).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText('Market order type')).toBeOnTheScreen();
    expect(screen.getByLabelText('Margin, Isolated, $3.41')).toBeOnTheScreen();
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
    expect(screen.getByText('$98.50')).toBeOnTheScreen();
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
