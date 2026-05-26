import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyPayWithScreen from './QuickBuyPayWithScreen';
import { useQuickBuyContext } from './useQuickBuyContext';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('./hooks/useChainDisplayInfos', () => ({
  useChainDisplayInfos: jest.fn(),
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
    (useChainDisplayInfos as jest.Mock).mockImplementation(
      (chainIds: string[]) =>
        chainIds.map((chainId) => ({
          chainId,
          name: chainId === '0x1' ? 'Ethereum' : 'BNB Chain',
          imageSource: { uri: 'https://example.com/network.png' },
        })),
    );
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

  it('shows the chain filter when tokens span multiple chains', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [
        createToken({ symbol: 'USDC', chainId: '0x1' }),
        createToken({
          symbol: 'USDT',
          chainId: '0x38',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        }),
      ],
      selectedSourceToken: createToken(),
      handleSelectSourceToken,
      setActiveScreen,
    });

    render(<QuickBuyPayWithScreen />);

    expect(screen.getByTestId('quick-buy-chain-filter-all')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-chain-filter-0x1')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-chain-filter-0x38')).toBeOnTheScreen();
  });

  it('hides the chain filter when all tokens are on the same chain', () => {
    render(<QuickBuyPayWithScreen />);

    expect(
      screen.queryByTestId('quick-buy-pay-with-chain-filter'),
    ).not.toBeOnTheScreen();
  });

  it('filters token rows when a chain pill is pressed', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [
        createToken({ symbol: 'USDC', chainId: '0x1' }),
        createToken({
          symbol: 'USDT',
          chainId: '0x38',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        }),
      ],
      selectedSourceToken: createToken(),
      handleSelectSourceToken,
      setActiveScreen,
    });

    render(<QuickBuyPayWithScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-0x38'));

    expect(screen.getByTestId('quick-buy-pay-with-row-USDT')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-pay-with-row-USDC'),
    ).not.toBeOnTheScreen();
  });

  it('shows all token rows when the All pill is pressed', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [
        createToken({ symbol: 'USDC', chainId: '0x1' }),
        createToken({
          symbol: 'USDT',
          chainId: '0x38',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        }),
      ],
      selectedSourceToken: createToken(),
      handleSelectSourceToken,
      setActiveScreen,
    });

    render(<QuickBuyPayWithScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-0x38'));
    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-all'));

    expect(screen.getByTestId('quick-buy-pay-with-row-USDC')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-pay-with-row-USDT')).toBeOnTheScreen();
  });
});
