import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  getPerpsTPSLViewSelector,
  PerpsTPSLViewSelectorsIDs,
  PerpsTradeSheetSelectorsIDs,
} from '../../Perps.testIds';
import {
  PerpsTradeInfoScreen,
  PerpsTradeLeverageScreen,
  PerpsTradeTPSLScreen,
} from './PerpsTradeNestedScreens';

const mockGoBack = jest.fn();
const mockClose = jest.fn();
const mockTrack = jest.fn();
let mockLeverageSheetProps: Record<string, unknown> | undefined;
const mockHandleTakeProfitOff = jest.fn();
const mockHandleStopLossOff = jest.fn();
const mockHandleTakeProfitPercentageButton = jest.fn();
const mockHandleStopLossPercentageButton = jest.fn();
const mockHandleTakeProfitPriceChange = jest.fn();
const mockHandleTakeProfitPercentageChange = jest.fn();
const mockHandleStopLossPriceChange = jest.fn();
const mockHandleStopLossPercentageChange = jest.fn();
const mockHandleTakeProfitPriceFocus = jest.fn();
const mockHandleTakeProfitPercentageFocus = jest.fn();
const mockHandleStopLossPriceFocus = jest.fn();
const mockHandleStopLossPercentageFocus = jest.fn();
const mockHandleTakeProfitPriceBlur = jest.fn();
const mockHandleTakeProfitPercentageBlur = jest.fn();
const mockHandleStopLossPriceBlur = jest.fn();
const mockHandleStopLossPercentageBlur = jest.fn();
let mockHasChanges = true;
let mockIsValid = true;
let mockTakeProfitError = '';
let mockStopLossError = '';
let mockStopLossLiquidationError = '';
let mockExpectedTakeProfitPnL: number | undefined;
let mockExpectedStopLossPnL: number | undefined;

jest.mock('./PerpsTradeBottomSheet', () => ({
  usePerpsTradeSheet: () => ({
    goBack: mockGoBack,
    close: mockClose,
  }),
}));

jest.mock('../PerpsLeverageBottomSheet', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockLeverageSheetProps = props;
    return null;
  },
}));
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));
jest.mock('../../hooks/usePerpsTPSLForm', () => ({
  usePerpsTPSLForm: () => ({
    formState: {
      takeProfitPrice: '110',
      stopLossPrice: '90',
      takeProfitPercentage: '30',
      stopLossPercentage: '30',
      takeProfitSign: '+',
      stopLossSign: '-',
    },
    handlers: {
      handleTakeProfitPriceChange: mockHandleTakeProfitPriceChange,
      handleTakeProfitPercentageChange: mockHandleTakeProfitPercentageChange,
      handleStopLossPriceChange: mockHandleStopLossPriceChange,
      handleStopLossPercentageChange: mockHandleStopLossPercentageChange,
      handleTakeProfitPriceFocus: mockHandleTakeProfitPriceFocus,
      handleTakeProfitPriceBlur: mockHandleTakeProfitPriceBlur,
      handleTakeProfitPercentageFocus: mockHandleTakeProfitPercentageFocus,
      handleTakeProfitPercentageBlur: mockHandleTakeProfitPercentageBlur,
      handleStopLossPriceFocus: mockHandleStopLossPriceFocus,
      handleStopLossPriceBlur: mockHandleStopLossPriceBlur,
      handleStopLossPercentageFocus: mockHandleStopLossPercentageFocus,
      handleStopLossPercentageBlur: mockHandleStopLossPercentageBlur,
    },
    buttons: {
      handleTakeProfitOff: mockHandleTakeProfitOff,
      handleStopLossOff: mockHandleStopLossOff,
      handleTakeProfitPercentageButton: mockHandleTakeProfitPercentageButton,
      handleStopLossPercentageButton: mockHandleStopLossPercentageButton,
      handleTakeProfitSignToggle: jest.fn(),
      handleStopLossSignToggle: jest.fn(),
    },
    validation: {
      isValid: mockIsValid,
      hasChanges: mockHasChanges,
      takeProfitError: mockTakeProfitError,
      stopLossError: mockStopLossError,
      stopLossLiquidationError: mockStopLossLiquidationError,
    },
    display: {
      formattedTakeProfitPercentage: '30',
      formattedStopLossPercentage: '30',
      expectedTakeProfitPnL: mockExpectedTakeProfitPnL,
      expectedStopLossPnL: mockExpectedStopLossPnL,
    },
  }),
}));

const defaultProps: React.ComponentProps<typeof PerpsTradeTPSLScreen> = {
  asset: 'SOL',
  amount: '10',
  currentPrice: 100,
  direction: 'long',
  initialTakeProfitPrice: '110',
  initialStopLossPrice: '90',
  leverage: 3,
  liquidationPrice: '70',
  orderType: 'market',
  szDecimals: 2,
  onSave: jest.fn(),
};

describe('PerpsTradeNestedScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasChanges = true;
    mockIsValid = true;
    mockTakeProfitError = '';
    mockStopLossError = '';
    mockStopLossLiquidationError = '';
    mockExpectedTakeProfitPnL = undefined;
    mockExpectedStopLossPnL = undefined;
    mockLeverageSheetProps = undefined;
  });

  describe('PerpsTradeLeverageScreen', () => {
    it('embeds the leverage sheet as a nested screen wired to the sheet navigation', () => {
      const onConfirm = jest.fn();

      render(
        <PerpsTradeLeverageScreen
          onConfirm={onConfirm}
          leverage={3}
          minLeverage={1}
          maxLeverage={40}
          currentPrice={100}
          direction="long"
          asset="SOL"
          orderType="market"
        />,
      );

      expect(mockLeverageSheetProps).toEqual(
        expect.objectContaining({
          isVisible: true,
          presentation: 'screen',
          onBack: mockGoBack,
          onClose: mockClose,
          onConfirmComplete: mockGoBack,
          onConfirm,
          leverage: 3,
          maxLeverage: 40,
        }),
      );
    });
  });

  describe('PerpsTradeInfoScreen', () => {
    it('renders the margin explainer inline with a back button and Got it', () => {
      render(<PerpsTradeInfoScreen contentKey="margin" />);

      expect(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_SCREEN),
      ).toBeOnTheScreen();
      expect(screen.getByText('Margin')).toBeOnTheScreen();
      expect(
        screen.getByText(/Margin is the money you put in to open a trade/),
      ).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_BACK_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('renders the liquidation price explainer', () => {
      render(<PerpsTradeInfoScreen contentKey="liquidation_price" />);

      expect(screen.getByText('Liquidation price')).toBeOnTheScreen();
      expect(
        screen.getByText(/If the price hits this point/),
      ).toBeOnTheScreen();
    });

    it('tracks the tooltip interaction and returns to Trade from Got it', () => {
      render(<PerpsTradeInfoScreen contentKey="margin" />);

      fireEvent.press(
        screen.getByTestId(PerpsTradeSheetSelectorsIDs.INFO_GOT_IT_BUTTON),
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          interaction_type: 'button_clicked',
          button_clicked: 'tooltip',
          button_location: 'perps_asset_screen',
        }),
      );
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the liquidation distance and a trend icon next to the liquidation price', () => {
    render(
      <PerpsTradeTPSLScreen
        {...defaultProps}
        currentPrice={100}
        liquidationPrice="70"
        direction="long"
      />,
    );

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.LIQUIDATION_PRICE_ROW),
    ).toHaveAccessibleName('Liquidation price, $70, 30.00%');
    expect(screen.getByText('30.00%')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.LIQUIDATION_TREND_ICON),
    ).toBeOnTheScreen();
  });

  it('shows only the fallback when the liquidation price is unknown', () => {
    render(
      <PerpsTradeTPSLScreen {...defaultProps} liquidationPrice={undefined} />,
    );

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.LIQUIDATION_PRICE_ROW),
    ).toHaveAccessibleName('Liquidation price, --');
    expect(
      screen.queryByTestId(PerpsTPSLViewSelectorsIDs.LIQUIDATION_TREND_ICON),
    ).not.toBeOnTheScreen();
  });

  it('renders Clear as a primary-coloured text link', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    const clearButton = screen.getByTestId(
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_CLEAR_BUTTON,
    );

    expect(clearButton).toHaveTextContent('Clear');
    expect(clearButton.props.accessibilityRole).toBe('button');
    expect(StyleSheet.flatten(clearButton.props.style)).toMatchObject({
      color: lightTheme.colors.primary.default,
    });
  });

  it('commits TP/SL before returning to Trade', async () => {
    const onSave = jest.fn();
    render(<PerpsTradeTPSLScreen {...defaultProps} onSave={onSave} />);

    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('110', '90');
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('stays on the screen and disables Save while saving', async () => {
    let resolveSave: () => void = () => undefined;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<PerpsTradeTPSLScreen {...defaultProps} onSave={onSave} />);

    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON));

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeDisabled();
    expect(mockGoBack).not.toHaveBeenCalled();

    await act(async () => resolveSave());

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('clears TP/SL independently', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_CLEAR_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_CLEAR_BUTTON),
    );

    expect(mockHandleTakeProfitOff).toHaveBeenCalledTimes(1);
    expect(mockHandleStopLossOff).toHaveBeenCalledTimes(1);
  });

  it('dismisses the keypad when clearing the focused field', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);
    fireEvent(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT),
      'focus',
    );

    fireEvent.press(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_CLEAR_BUTTON),
    );

    expect(
      screen.queryByTestId(PerpsTPSLViewSelectorsIDs.DONE_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeOnTheScreen();
  });

  it('returns to Trade from the back button', () => {
    const onSave = jest.fn();
    render(<PerpsTradeTPSLScreen {...defaultProps} onSave={onSave} />);

    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps Save visible and shows take-profit presets above the keypad', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    fireEvent(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT),
      'focus',
    );

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.DONE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getPerpsTPSLViewSelector.takeProfitPercentageButton(50),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('7')).toBeOnTheScreen();
  });

  it('applies the preset for the focused TP/SL section', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    fireEvent(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT),
      'focus',
    );
    fireEvent.press(
      screen.getByTestId(
        getPerpsTPSLViewSelector.stopLossPercentageButton(-25),
      ),
    );

    expect(mockHandleStopLossPercentageButton).toHaveBeenCalledWith(-25);
    expect(mockHandleTakeProfitPercentageButton).not.toHaveBeenCalled();
  });

  it('hides the keypad again from Done', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    const input = screen.getByTestId(
      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PERCENTAGE_INPUT,
    );
    fireEvent(input, 'focus');
    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.DONE_BUTTON));

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsTPSLViewSelectorsIDs.DONE_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('shows expected profit and loss for populated fields', () => {
    mockExpectedTakeProfitPnL = 42.5;
    mockExpectedStopLossPnL = -12.25;

    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    expect(screen.getByText('Expected profit: $42.50')).toBeOnTheScreen();
    expect(screen.getByText('Expected loss: $12.25')).toBeOnTheScreen();
  });

  it('routes keypad input to the focused field', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    fireEvent(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT),
      'focus',
    );
    fireEvent.press(screen.getByText('9'));

    expect(mockHandleStopLossPriceChange).toHaveBeenCalledWith('909');
  });

  it.each([
    [
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
      mockHandleTakeProfitPriceChange,
      '1109',
    ],
    [
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PERCENTAGE_INPUT,
      mockHandleTakeProfitPercentageChange,
      '309',
    ],
    [
      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PERCENTAGE_INPUT,
      mockHandleStopLossPercentageChange,
      '309',
    ],
  ])('routes keypad input from %s', (testID, changeHandler, expectedValue) => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);
    fireEvent(screen.getByTestId(testID), 'focus');

    fireEvent.press(screen.getByText('9'));

    expect(changeHandler).toHaveBeenCalledWith(expectedValue);
  });

  it.each([
    [
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
      mockHandleTakeProfitPriceFocus,
      mockHandleTakeProfitPriceBlur,
    ],
    [
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PERCENTAGE_INPUT,
      mockHandleTakeProfitPercentageFocus,
      mockHandleTakeProfitPercentageBlur,
    ],
    [
      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
      mockHandleStopLossPriceFocus,
      mockHandleStopLossPriceBlur,
    ],
    [
      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PERCENTAGE_INPUT,
      mockHandleStopLossPercentageFocus,
      mockHandleStopLossPercentageBlur,
    ],
  ])('forwards focus and blur from %s', (testID, focusHandler, blurHandler) => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);
    const input = screen.getByTestId(testID);

    fireEvent(input, 'focus');
    fireEvent(input, 'blur');

    expect(focusHandler).toHaveBeenCalledTimes(1);
    expect(blurHandler).toHaveBeenCalledTimes(1);
  });

  it('ignores a trigger price beyond the digit limit', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    fireEvent.changeText(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT),
      '12345678901234567890',
    );

    expect(mockHandleTakeProfitPriceChange).not.toHaveBeenCalled();
  });

  it('renders the ROE signs as static indicators', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_ROE_SIGN_BADGE, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Toggle take profit return sign' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Toggle stop loss return sign' }),
    ).toBeNull();
  });

  it('references the limit price once a limit order has one', () => {
    render(
      <PerpsTradeTPSLScreen
        {...defaultProps}
        orderType="limit"
        limitPrice="120"
      />,
    );

    expect(screen.getByText('Limit price')).toBeOnTheScreen();
    expect(screen.getByText('$120')).toBeOnTheScreen();
  });

  it('falls back to the current price for a limit order without a limit price', () => {
    render(<PerpsTradeTPSLScreen {...defaultProps} orderType="limit" />);

    expect(screen.getByText('Current price')).toBeOnTheScreen();
    expect(screen.getByText('$100')).toBeOnTheScreen();
  });

  it('disables Save and presents validation errors', () => {
    mockIsValid = false;
    mockTakeProfitError = 'Take profit must be above current price';

    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ERROR),
    ).toHaveTextContent('Take profit must be above current price');
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeDisabled();
  });

  it('disables Save when TP/SL values have not changed', () => {
    mockHasChanges = false;

    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeDisabled();
  });

  it('surfaces the stop loss liquidation error', () => {
    mockIsValid = false;
    mockStopLossLiquidationError = 'Stop loss must be above liquidation price';

    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_ERROR),
    ).toHaveTextContent('Stop loss must be above liquidation price');
  });

  it('holds back trigger price messages while the form is valid', () => {
    mockIsValid = true;
    mockTakeProfitError = 'Take profit must be above current price';
    mockStopLossError = 'Stop loss must be below current price';

    render(<PerpsTradeTPSLScreen {...defaultProps} />);

    expect(
      screen.queryByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ERROR),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_ERROR),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeEnabled();
  });
});
