import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';
import QuickBuyPayWithScreen from './QuickBuyPayWithScreen';
import { getTokenKey } from './tokenKey';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('./hooks/useChainDisplayInfos', () => ({
  useChainDisplayInfos: jest.fn(),
}));

jest.mock('./components/QuickBuyTokenSecurityBadge', () => {
  const ReactMock = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => ReactMock.createElement(ReactMock.Fragment),
  };
});

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToHex: (caipChainId: string) => {
    const [namespace, reference] = caipChainId.split(':');
    if (namespace !== 'eip155') {
      throw new Error(`unsupported chain ${caipChainId}`);
    }
    return `0x${parseInt(reference, 10).toString(16)}`;
  },
  isNonEvmChainId: (chainId: string) =>
    !chainId.startsWith('0x') && !chainId.startsWith('eip155:'),
  isNativeAddress: () => false,
  getNativeAssetForChainId: () => undefined,
}));

const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const getRowTestId = (token: BridgeToken): string =>
  `quick-buy-pay-with-row-${getTokenKey(token)}`;

const getChainFilterOrder = (): string[] =>
  screen
    .getAllByTestId(/^quick-buy-chain-filter-/)
    .map((node) => node.props.testID.replace('quick-buy-chain-filter-', ''));

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

const buildContext = (overrides: Record<string, unknown> = {}) => ({
  tradeMode: 'buy',
  target: {
    chain: 'eip155:1',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    tokenSymbol: 'ETH',
    tokenName: 'Ether',
  },
  sourceTokenOptions: [createToken()],
  selectedSourceToken: createToken(),
  handleSelectSourceToken: jest.fn(),
  setActiveScreen: jest.fn(),
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
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ handleSelectSourceToken, setActiveScreen }),
    );
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

  it('shows the empty state when there are no source tokens', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sourceTokenOptions: [],
        selectedSourceToken: undefined,
        handleSelectSourceToken,
        setActiveScreen,
      }),
    );

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
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
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
      }),
    );

    render(<QuickBuyPayWithScreen />);

    expect(screen.getByTestId('quick-buy-chain-filter-all')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-chain-filter-0x1')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-chain-filter-0x38')).toBeOnTheScreen();
  });

  it("orders the viewed token's network first after All", () => {
    const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
    const usdtToken = createToken({
      symbol: 'USDT',
      chainId: '0x38',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        // Viewed token is on 0x38, even though the first held token is on 0x1.
        target: {
          chain: 'eip155:56',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'BNB',
          tokenName: 'BNB',
        },
        sourceTokenOptions: [usdcToken, usdtToken],
        selectedSourceToken: usdcToken,
        handleSelectSourceToken,
        setActiveScreen,
      }),
    );

    render(<QuickBuyPayWithScreen />);

    expect(getChainFilterOrder()).toEqual(['all', '0x38', '0x1']);
  });

  it('orders a non-EVM viewed network first after All', () => {
    const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
    const solToken = createToken({
      symbol: 'SOL',
      chainId: SOLANA_CHAIN_ID,
      address: `${SOLANA_CHAIN_ID}/slip44:501`,
    });
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        target: {
          chain: SOLANA_CHAIN_ID,
          tokenAddress: `${SOLANA_CHAIN_ID}/slip44:501`,
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
        },
        sourceTokenOptions: [usdcToken, solToken],
        selectedSourceToken: usdcToken,
        handleSelectSourceToken,
        setActiveScreen,
      }),
    );

    render(<QuickBuyPayWithScreen />);

    expect(getChainFilterOrder()).toEqual(['all', SOLANA_CHAIN_ID, '0x1']);
  });

  it('keeps the held-token order when the viewed network is not held', () => {
    const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
    const usdtToken = createToken({
      symbol: 'USDT',
      chainId: '0x38',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    });
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        target: {
          chain: SOLANA_CHAIN_ID,
          tokenAddress: `${SOLANA_CHAIN_ID}/slip44:501`,
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
        },
        sourceTokenOptions: [usdcToken, usdtToken],
        selectedSourceToken: usdcToken,
        handleSelectSourceToken,
        setActiveScreen,
      }),
    );

    render(<QuickBuyPayWithScreen />);

    expect(getChainFilterOrder()).toEqual(['all', '0x1', '0x38']);
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
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sourceTokenOptions: [usdcToken, usdtToken],
        selectedSourceToken: createToken(),
        handleSelectSourceToken,
        setActiveScreen,
      }),
    );

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
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sourceTokenOptions: [usdcToken, usdtToken],
        selectedSourceToken: createToken(),
        handleSelectSourceToken,
        setActiveScreen,
      }),
    );

    render(<QuickBuyPayWithScreen />);

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-0x38'));
    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-all'));

    expect(screen.getByTestId(getRowTestId(usdcToken))).toBeOnTheScreen();
    expect(screen.getByTestId(getRowTestId(usdtToken))).toBeOnTheScreen();
  });

  it('fills the available height so the token list scrolls within a fixed area', () => {
    render(<QuickBuyPayWithScreen />);

    const scrollView = screen.getByTestId('quick-buy-pay-with-scroll');
    const flattenedStyle = StyleSheet.flatten(scrollView.props.style);

    expect(flattenedStyle?.flex ?? flattenedStyle?.flexGrow).toBe(1);
  });
});
