import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
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
});
