import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import QuickBuyEditQuickAmountsScreen from './QuickBuyEditQuickAmountsScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./components/QuickBuySubScreenHeader', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) =>
      ReactMock.createElement(Text, { testID: 'quick-buy-edit-header' }, title),
  };
});

jest.mock('../../../../../Base/Keypad', () => {
  const ReactMock = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (data: { value: string }) => void }) =>
      ReactMock.createElement(
        Pressable,
        {
          testID: 'quick-buy-edit-keypad',
          onPress: () => onChange({ value: '12' }),
        },
        ReactMock.createElement(Text, null, 'keypad'),
      ),
  };
});

const saveQuickAmountPreferences = jest.fn().mockResolvedValue(undefined);
const setActiveScreen = jest.fn();

const baseContext = {
  currentCurrency: 'USD',
  usdToCurrentCurrencyRate: 1,
  buyQuickAmounts: [10, 50, 100, 250] as [number, number, number, number],
  sellQuickPercentages: [25, 50, 75, 100] as [number, number, number, number],
  isQuickAmountPreferencesLoaded: true,
  saveQuickAmountPreferences,
  setActiveScreen,
  onClose: jest.fn(),
};

describe('QuickBuyEditQuickAmountsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(baseContext);
  });

  it('renders the edit screen with the keypad open by default', () => {
    render(<QuickBuyEditQuickAmountsScreen />);

    expect(screen.getByTestId('quick-buy-edit-header')).toHaveTextContent(
      'social_leaderboard.quick_buy.edit_quick_amounts_title',
    );
    expect(
      screen.getByTestId('quick-buy-edit-amounts-confirm'),
    ).not.toBeDisabled();
    expect(
      screen.getByTestId('quick-buy-edit-amounts-keypad'),
    ).toBeOnTheScreen();
  });

  it('keeps the amount rows visible while the keypad is open', () => {
    render(<QuickBuyEditQuickAmountsScreen />);

    expect(screen.getByTestId('quick-buy-edit-buy-field-0')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-edit-sell-field-0')).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-edit-amounts-keypad'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-edit-amounts-confirm'),
    ).toBeOnTheScreen();
  });

  it('switches focus without collapsing the keypad', () => {
    render(<QuickBuyEditQuickAmountsScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-edit-sell-field-1'));

    expect(
      screen.getByTestId('quick-buy-edit-amounts-keypad'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('quick-buy-edit-sell-field-1'));
    expect(
      screen.getByTestId('quick-buy-edit-amounts-keypad'),
    ).toBeOnTheScreen();
  });

  it('renders row-level validation errors at full width below the pills', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      buyQuickAmounts: [0, 50, 100, 250],
    });

    render(<QuickBuyEditQuickAmountsScreen />);

    expect(
      screen.getByTestId('quick-buy-edit-buy-row-error'),
    ).toHaveTextContent(
      'social_leaderboard.quick_buy.edit_quick_amounts_buy_above_zero',
    );
  });

  it('saves preferences and returns to the amount screen on confirm', async () => {
    render(<QuickBuyEditQuickAmountsScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-edit-keypad'));
    fireEvent.press(screen.getByTestId('quick-buy-edit-amounts-confirm'));

    await waitFor(() => {
      expect(saveQuickAmountPreferences).toHaveBeenCalledWith({
        buyAmounts: [12, 50, 100, 250],
        sellPercentages: [25, 50, 75, 100],
      });
      expect(setActiveScreen).toHaveBeenCalledWith('amount');
    });
  });
});
