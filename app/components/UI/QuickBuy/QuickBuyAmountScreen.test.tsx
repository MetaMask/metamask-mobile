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

  it('leaves the amount area interactive when the user has funds to pay with', () => {
    render(<QuickBuyAmountScreen />);

    expect(screen.queryByTestId('quick-buy-disabled-section')).toBeNull();
  });

  // TSA-984: with nothing to pay with no quote can be fetched, so the amount
  // area is dimmed and inert instead of silently swallowing taps.
  it('makes the amount area inert when the user has nothing to pay with', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: false,
      hasNoPayWithFunds: true,
    });

    render(<QuickBuyAmountScreen />);

    const disabled = screen.getByTestId('quick-buy-disabled-section');
    expect(disabled.props.pointerEvents).toBe('none');
    expect(screen.getByTestId('quick-buy-amount-container')).toBeOnTheScreen();
  });

  it('keeps the toolbar outside the inert region so the sheet can still be closed', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      isUnsupportedChain: false,
      hasNoPayWithFunds: true,
    });

    render(<QuickBuyAmountScreen />);

    // The toolbar owns the close button — trapping the user in an inert sheet
    // would be a worse failure than the bug being fixed.
    const disabled = screen.getByTestId('quick-buy-disabled-section');
    expect(screen.getByTestId('mock-toolbar')).toBeOnTheScreen();
    expect(within(disabled).queryByTestId('mock-toolbar')).toBeNull();
  });
});
