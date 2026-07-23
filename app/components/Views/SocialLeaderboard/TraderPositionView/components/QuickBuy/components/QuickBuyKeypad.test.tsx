import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import QuickBuyKeypad from './QuickBuyKeypad';
import { useQuickBuyContext } from '../useQuickBuyContext';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../utils/quickBuyQuickAmounts', () => ({
  getBuyQuickAmounts: jest.fn(() => [
    { value: 10, label: '$10', presetTierUsd: 10 },
    { value: 50, label: '$50', presetTierUsd: 50 },
    { value: 100, label: '$100', presetTierUsd: 100 },
    { value: 250, label: '$250', presetTierUsd: 250 },
  ]),
  SELL_QUICK_PERCENTAGES: [25, 50, 75, 100],
}));

jest.mock('../../../../../../../util/haptics', () => ({
  ...jest.requireActual<typeof import('../../../../../../../util/haptics')>(
    '../../../../../../../util/haptics',
  ),
  useHaptics: jest.fn(() => ({ playImpact: jest.fn() })),
}));

const baseContext = {
  useKeyboard: true,
  isKeypadOpen: true,
  hasSourcePrice: true,
  fiatAmount: '',
  sourceAmountTokens: '',
  handleAmountChange: jest.fn(),
  setIsKeypadOpen: jest.fn(),
  features: { quickAmountPills: true },
  tradeMode: 'buy' as const,
  currentCurrency: 'USD',
  usdToCurrentCurrencyRate: 1,
  isSliderDisabled: false,
  handleQuickAmountPress: jest.fn(),
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
};

describe('QuickBuyKeypad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(baseContext);
  });

  it('renders nothing on the slider control variant', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      useKeyboard: false,
    });

    renderWithProvider(<QuickBuyKeypad />);

    expect(screen.queryByTestId('quick-buy-keypad')).toBeNull();
  });

  it('renders nothing when the keypad is dismissed', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      isKeypadOpen: false,
    });

    renderWithProvider(<QuickBuyKeypad />);

    expect(screen.queryByTestId('quick-buy-keypad')).toBeNull();
  });

  it('feeds a keystroke into handleAmountChange for a priced (fiat) source', () => {
    renderWithProvider(<QuickBuyKeypad />);

    expect(screen.getByTestId('quick-buy-keypad')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-keypad-done')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('keypad-key-5'));

    expect(baseContext.handleAmountChange).toHaveBeenCalledWith('5');
  });

  it('cleans a trailing decimal and dismisses the keypad when Done is pressed', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      fiatAmount: '250.',
    });

    renderWithProvider(<QuickBuyKeypad />);

    fireEvent.press(screen.getByTestId('quick-buy-keypad-done'));

    expect(baseContext.handleAmountChange).toHaveBeenCalledWith('250');
    expect(baseContext.setIsKeypadOpen).toHaveBeenCalledWith(false);
  });

  it('appends to the source token amount for an unpriced source', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      hasSourcePrice: false,
      sourceAmountTokens: '1',
    });

    renderWithProvider(<QuickBuyKeypad />);

    fireEvent.press(screen.getByTestId('keypad-key-2'));

    expect(baseContext.handleAmountChange).toHaveBeenCalledWith('12');
  });
});
