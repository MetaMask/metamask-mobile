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
  buyQuickAmounts: [10, 50, 100, 250] as [number, number, number, number],
  sellQuickPercentages: [25, 50, 75, 100] as [number, number, number, number],
  saveQuickAmountPreferences,
  setActiveScreen,
  onClose: jest.fn(),
};

describe('QuickBuyEditQuickAmountsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(baseContext);
  });

  it('renders the edit screen with confirm enabled for valid defaults', () => {
    render(<QuickBuyEditQuickAmountsScreen />);

    expect(screen.getByTestId('quick-buy-edit-header')).toHaveTextContent(
      'social_leaderboard.quick_buy.edit_quick_amounts_title',
    );
    expect(
      screen.getByTestId('quick-buy-edit-amounts-confirm'),
    ).not.toBeDisabled();
  });

  it('saves preferences and returns to the amount screen on confirm', async () => {
    render(<QuickBuyEditQuickAmountsScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-edit-buy-field-0'));
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
