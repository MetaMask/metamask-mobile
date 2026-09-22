import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  getPerpsTPSLViewSelector,
  PerpsTPSLViewSelectorsIDs,
} from '../../Perps.testIds';
import { PerpsTradeTPSLScreen } from './PerpsTradeNestedScreens';

const mockGoBack = jest.fn();
const mockHandleTakeProfitOff = jest.fn();
const mockHandleStopLossOff = jest.fn();
const mockHandleTakeProfitPercentageButton = jest.fn();
const mockHandleStopLossPercentageButton = jest.fn();
const mockHandleStopLossPriceChange = jest.fn();
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
  }),
}));

jest.mock('../PerpsLeverageBottomSheet', () => () => null);
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
      handleTakeProfitPriceChange: jest.fn(),
      handleTakeProfitPercentageChange: jest.fn(),
      handleStopLossPriceChange: mockHandleStopLossPriceChange,
      handleStopLossPercentageChange: jest.fn(),
      handleTakeProfitPriceFocus: jest.fn(),
      handleTakeProfitPriceBlur: jest.fn(),
      handleTakeProfitPercentageFocus: jest.fn(),
      handleTakeProfitPercentageBlur: jest.fn(),
      handleStopLossPriceFocus: jest.fn(),
      handleStopLossPriceBlur: jest.fn(),
      handleStopLossPercentageFocus: jest.fn(),
      handleStopLossPercentageBlur: jest.fn(),
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
