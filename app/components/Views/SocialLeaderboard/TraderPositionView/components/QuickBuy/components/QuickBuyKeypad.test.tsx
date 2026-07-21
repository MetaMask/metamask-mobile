import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import QuickBuyKeypad from './QuickBuyKeypad';
import { useQuickBuyContext } from '../useQuickBuyContext';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

const baseContext = {
  useKeyboard: true,
  isKeypadOpen: true,
  hasSourcePrice: true,
  fiatAmount: '',
  sourceAmountTokens: '',
  handleAmountChange: jest.fn(),
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

    fireEvent.press(screen.getByTestId('keypad-key-5'));

    expect(baseContext.handleAmountChange).toHaveBeenCalledWith('5');
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
