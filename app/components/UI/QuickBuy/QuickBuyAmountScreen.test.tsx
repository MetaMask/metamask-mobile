import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./components/QuickBuyToolbar', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactMock.createElement(View, { testID: 'mock-toolbar' }),
  };
});

jest.mock('./QuickBuyAmount', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactMock.createElement(View, { testID: 'mock-amount' }),
  };
});

jest.mock('./components/QuickBuyActionFooter', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactMock.createElement(View, { testID: 'mock-footer' }),
  };
});

describe('QuickBuyAmountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: false,
    });
  });

  it('renders the amount area in a non-scrollable container', () => {
    render(<QuickBuyAmountScreen />);

    expect(screen.getByTestId('quick-buy-amount-container')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-amount')).toBeOnTheScreen();
    expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  });

  it('renders unsupported chain message when chain is unsupported', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: true,
    });

    render(<QuickBuyAmountScreen />);

    expect(
      screen.getByText('social_leaderboard.quick_buy.unsupported_chain'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('quick-buy-amount-container')).toBeNull();
  });

  it('leaves the amount area and keypad interactive when the user has funds', () => {
    render(<QuickBuyAmountScreen />);

    expect(screen.queryByTestId('quick-buy-disabled-amount')).toBeNull();
    expect(screen.queryByTestId('quick-buy-disabled-keypad')).toBeNull();
  });

  // TSA-984: with nothing to pay with no quote can be fetched, so the amount
  // area is dimmed and inert instead of silently swallowing taps.
  it('makes the amount area inert when the user has nothing to pay with', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: false,
      hasNoPayWithFunds: true,
    });

    render(<QuickBuyAmountScreen />);

    const disabled = screen.getByTestId('quick-buy-disabled-amount');
    expect(disabled.props.pointerEvents).toBe('none');
    expect(screen.getByTestId('quick-buy-amount-container')).toBeOnTheScreen();
  });

  // Regression guard: the keypad must stay mounted and expanded so the sheet
  // height never depends on `hasNoPayWithFunds` (that dependency made a funded
  // account open collapsed then expand — a visible flash). It is blocked rather
  // than collapsed, so its digit keys cannot type into a dead amount field.
  it('keeps the keypad mounted but inert when the user has nothing to pay with', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: false,
      hasNoPayWithFunds: true,
    });

    render(<QuickBuyAmountScreen />);

    const disabledKeypad = screen.getByTestId('quick-buy-disabled-keypad');
    expect(disabledKeypad.props.pointerEvents).toBe('none');
  });

  it('keeps the toolbar outside the inert regions so the sheet can still be closed', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: false,
      hasNoPayWithFunds: true,
    });

    render(<QuickBuyAmountScreen />);

    // The toolbar owns the close button — trapping the user in an inert sheet
    // would be a worse failure than the bug being fixed.
    expect(screen.getByTestId('mock-toolbar')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('quick-buy-disabled-amount')).queryByTestId(
        'mock-toolbar',
      ),
    ).toBeNull();
    expect(
      within(screen.getByTestId('quick-buy-disabled-keypad')).queryByTestId(
        'mock-toolbar',
      ),
    ).toBeNull();
  });
});
