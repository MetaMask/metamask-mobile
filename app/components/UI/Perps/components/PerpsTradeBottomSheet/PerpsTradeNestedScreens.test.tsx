import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import { PerpsTradeSettingsScreen } from './PerpsTradeNestedScreens';

const mockGoBack = jest.fn();
const mockClose = jest.fn();
const mockHandleTakeProfitOff = jest.fn();
const mockHandleStopLossOff = jest.fn();
let mockHasChanges = true;

jest.mock('./PerpsTradeBottomSheet', () => ({
  usePerpsTradeSheet: () => ({
    close: mockClose,
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
      handleStopLossPriceChange: jest.fn(),
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
      handleTakeProfitSignToggle: jest.fn(),
      handleStopLossSignToggle: jest.fn(),
    },
    validation: {
      isValid: true,
      hasChanges: mockHasChanges,
      takeProfitError: '',
      stopLossError: '',
      stopLossLiquidationError: '',
    },
  }),
}));

jest.mock('../PerpsSlippageBottomSheet', () => {
  const { Pressable: MockPressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      const { onSave, onSaveComplete } = props as {
        onSave: (value: number) => void;
        onSaveComplete: () => void;
      };
      return (
        <MockPressable
          testID="slippage-save"
          onPress={() => {
            onSave(100);
            onSaveComplete();
          }}
        />
      );
    },
  };
});

const defaultProps: React.ComponentProps<typeof PerpsTradeSettingsScreen> = {
  asset: 'SOL',
  amount: '10',
  currentPrice: 100,
  direction: 'long',
  estimatedSlippageBps: 0,
  initialTakeProfitPrice: '110',
  initialStopLossPrice: '90',
  leverage: 3,
  liquidationPrice: '70',
  maxSlippageBps: 300,
  orderType: 'market',
  szDecimals: 2,
  onOrderTypeChange: jest.fn(),
  onSave: jest.fn(),
};

describe('PerpsTradeNestedScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasChanges = true;
  });

  it('commits TP/SL and slippage before returning to Trade', () => {
    const onSave = jest.fn();
    render(<PerpsTradeSettingsScreen {...defaultProps} onSave={onSave} />);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SETTINGS_SLIPPAGE_ROW),
    );
    fireEvent.press(screen.getByTestId('slippage-save'));
    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SETTINGS_SAVE_BUTTON),
    );

    expect(onSave).toHaveBeenCalledWith({
      takeProfitPrice: '110',
      stopLossPrice: '90',
      maxSlippageBps: 100,
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('updates order type without leaving the nested screen', () => {
    const onOrderTypeChange = jest.fn();
    render(
      <PerpsTradeSettingsScreen
        {...defaultProps}
        onOrderTypeChange={onOrderTypeChange}
      />,
    );

    fireEvent.press(screen.getByText('Limit'));

    expect(onOrderTypeChange).toHaveBeenCalledWith('limit');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('clears TP/SL independently', () => {
    render(<PerpsTradeSettingsScreen {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SETTINGS_TP_CLEAR_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SETTINGS_SL_CLEAR_BUTTON),
    );

    expect(mockHandleTakeProfitOff).toHaveBeenCalledTimes(1);
    expect(mockHandleStopLossOff).toHaveBeenCalledTimes(1);
  });

  it('returns to Trade from the back button without closing the sheet', () => {
    render(<PerpsTradeSettingsScreen {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SETTINGS_BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockClose).not.toHaveBeenCalled();
  });
});
