import React from 'react';
import { screen } from '@testing-library/react-native';
import QuickBuyKeypad from './QuickBuyKeypad';
import { useQuickBuyContext } from '../useQuickBuyContext';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockKeypad = jest.fn(
  ({
    currency,
    value,
  }: {
    currency?: string;
    value: string;
    onChange: (data: { value: string }) => void;
  }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View
        testID="keypad-mock"
        accessibilityLabel={`${currency ?? ''}:${value}`}
      />
    );
  },
);

jest.mock('../../../../../../Base/Keypad', () => ({
  __esModule: true,
  default: (props: {
    currency?: string;
    value: string;
    onChange: (data: { value: string }) => void;
  }) => mockKeypad(props),
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
  buyQuickAmounts: [10, 50, 100, 250] as [number, number, number, number],
  sellQuickPercentages: [25, 50, 75, 100] as [number, number, number, number],
  isQuickAmountPreferencesLoaded: true,
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
    expect(screen.queryByTestId('quick-buy-keypad-done')).toBeNull();

    const { onChange } = mockKeypad.mock.calls.at(-1)?.[0] ?? {};
    onChange?.({ value: '5' });

    expect(baseContext.handleAmountChange).toHaveBeenCalledWith('5');
  });

  it('passes the user display currency and localized value to the keypad', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      currentCurrency: 'EUR',
      fiatAmount: '250.5',
    });

    renderWithProvider(<QuickBuyKeypad />);

    expect(screen.getByTestId('keypad-mock').props.accessibilityLabel).toBe(
      'EUR:250,5',
    );
  });

  it('appends to the source token amount for an unpriced source', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      hasSourcePrice: false,
      sourceAmountTokens: '1',
    });

    renderWithProvider(<QuickBuyKeypad />);

    const { onChange } = mockKeypad.mock.calls.at(-1)?.[0] ?? {};
    onChange?.({ value: '12' });

    expect(baseContext.handleAmountChange).toHaveBeenCalledWith('12');
    expect(screen.getByTestId('keypad-mock').props.accessibilityLabel).toBe(
      'native:1',
    );
  });
});
