import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyPayWithScreen from './QuickBuyPayWithScreen';
import { useQuickBuyContext } from './useQuickBuyContext';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';
import { getTokenKey } from './sourceTokenCandidates';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('./hooks/useChainDisplayInfos', () => ({
  useChainDisplayInfos: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const getRowTestId = (token: BridgeToken): string =>
  `quick-buy-pay-with-row-${getTokenKey(token)}`;

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
    const token = createToken();
    render(<QuickBuyPayWithScreen />);
    expect(screen.getByTestId(getRowTestId(token))).toBeOnTheScreen();
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
    fireEvent.press(screen.getByTestId(getRowTestId(token)));
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
    const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
    const usdtToken = createToken({
      symbol: 'USDT',
      chainId: '0x38',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [usdcToken, usdtToken],
      selectedSourceToken: createToken(),
      handleSelectSourceToken,
      setActiveScreen,
    });

    render(<QuickBuyPayWithScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-0x38'));

    expect(screen.getByTestId(getRowTestId(usdtToken))).toBeOnTheScreen();
    expect(screen.queryByTestId(getRowTestId(usdcToken))).not.toBeOnTheScreen();
  });

  it('shows all token rows when the All pill is pressed', () => {
    const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
    const usdtToken = createToken({
      symbol: 'USDT',
      chainId: '0x38',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      sourceTokenOptions: [usdcToken, usdtToken],
      selectedSourceToken: createToken(),
      handleSelectSourceToken,
      setActiveScreen,
    });

    render(<QuickBuyPayWithScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-0x38'));
    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-all'));

    expect(screen.getByTestId(getRowTestId(usdcToken))).toBeOnTheScreen();
    expect(screen.getByTestId(getRowTestId(usdtToken))).toBeOnTheScreen();
  });
});
