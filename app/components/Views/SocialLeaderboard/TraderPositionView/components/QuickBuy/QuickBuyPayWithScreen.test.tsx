import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyPayWithScreen from './QuickBuyPayWithScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactMock = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheetHeader: ({
      children,
      onBack,
      testID,
    }: {
      children: React.ReactNode;
      onBack?: () => void;
      testID?: string;
    }) =>
      ReactMock.createElement(
        View,
        { testID },
        ReactMock.createElement(
          TouchableOpacity,
          { testID: 'quick-buy-pay-with-back', onPress: onBack },
          ReactMock.createElement(Text, null, 'back'),
        ),
        children,
      ),
  };
});

const createToken = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  chainId: '0x1',
  balance: '100',
  balanceFiat: '$100.00',
  ...overrides,
});

describe('QuickBuyPayWithScreen', () => {
  const handleSelectSourceToken = jest.fn();
  const setActiveScreen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [createToken()],
      selectedSourceToken: createToken(),
      handleSelectSourceToken,
      setActiveScreen,
    });
  });

  it('renders the pay with header title', () => {
    render(<QuickBuyPayWithScreen />);
    expect(
      screen.getByText('social_leaderboard.quick_buy.pay_with'),
    ).toBeOnTheScreen();
  });

  it('renders source token rows', () => {
    render(<QuickBuyPayWithScreen />);
    expect(screen.getByTestId('quick-buy-pay-with-row-USDC')).toBeOnTheScreen();
  });

  it('shows empty state when there are no source tokens', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [],
      selectedSourceToken: undefined,
      handleSelectSourceToken,
      setActiveScreen,
    });

    render(<QuickBuyPayWithScreen />);
    expect(
      screen.getByText('social_leaderboard.quick_buy.pay_with_no_tokens'),
    ).toBeOnTheScreen();
  });

  it('returns to the amount screen when back is pressed', () => {
    render(<QuickBuyPayWithScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-pay-with-back'));
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });

  it('selects a token and returns to the amount screen when a row is pressed', () => {
    const token = createToken();
    render(<QuickBuyPayWithScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-pay-with-row-USDC'));
    expect(handleSelectSourceToken).toHaveBeenCalledWith(token);
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });
});
