import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';
import QuickBuyReceiveScreen from './QuickBuyReceiveScreen';
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

const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const TRON_CHAIN_ID = 'tron:728126428';
const BITCOIN_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93';

const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
const usdtToken = createToken({
  symbol: 'USDT',
  chainId: '0x1',
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
});
const solanaUsdcToken = createToken({
  symbol: 'USDC',
  chainId: SOLANA_CHAIN_ID,
  address: `${SOLANA_CHAIN_ID}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
});
const tronNativeToken = createToken({
  symbol: 'TRX',
  name: 'Tron',
  chainId: TRON_CHAIN_ID,
  address: `${TRON_CHAIN_ID}/slip44:195`,
});
const bitcoinNativeToken = createToken({
  symbol: 'BTC',
  name: 'Bitcoin',
  chainId: BITCOIN_CHAIN_ID,
  address: `${BITCOIN_CHAIN_ID}/slip44:0`,
});

const buildContext = (overrides: Record<string, unknown> = {}) => ({
  tradeMode: 'sell',
  target: {
    chain: 'eip155:1',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    tokenSymbol: 'ETH',
    tokenName: 'Ether',
  },
  sellDestTokenOptions: [usdcToken, usdtToken],
  selectedDestStable: usdcToken,
  handleSelectDestStable: jest.fn(),
  setActiveScreen: jest.fn(),
  ...overrides,
});

describe('QuickBuyReceiveScreen', () => {
  const handleSelectDestStable = jest.fn();
  const setActiveScreen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useChainDisplayInfos as jest.Mock).mockImplementation(
      (chainIds: string[]) =>
        chainIds.map((chainId) => ({
          chainId,
          name: 'Ethereum',
          imageSource: { uri: 'https://example.com/network.png' },
        })),
    );
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ handleSelectDestStable, setActiveScreen }),
    );
  });

  it('renders the receive header title', () => {
    render(<QuickBuyReceiveScreen />);
    expect(
      screen.getByText('social_leaderboard.quick_buy.receive'),
    ).toBeOnTheScreen();
  });

  it('renders the stablecoin rows', () => {
    render(<QuickBuyReceiveScreen />);
    expect(screen.getByTestId(getRowTestId(usdcToken))).toBeOnTheScreen();
    expect(screen.getByTestId(getRowTestId(usdtToken))).toBeOnTheScreen();
  });

  it('calls handleSelectDestStable and returns to the amount screen when a row is pressed', () => {
    render(<QuickBuyReceiveScreen />);
    fireEvent.press(screen.getByTestId(getRowTestId(usdtToken)));
    expect(handleSelectDestStable).toHaveBeenCalledWith(usdtToken);
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });

  it('returns to the amount screen when back is pressed', () => {
    render(<QuickBuyReceiveScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-pay-with-back'));
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });

  it('shows the empty state when there are no stablecoin options', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sellDestTokenOptions: [],
        selectedDestStable: undefined,
        handleSelectDestStable,
        setActiveScreen,
      }),
    );

    render(<QuickBuyReceiveScreen />);
    expect(
      screen.getByText('social_leaderboard.quick_buy.receive_with_no_tokens'),
    ).toBeOnTheScreen();
  });

  it('renders Solana, Tron and Bitcoin network chips when receive options exist on those chains', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sellDestTokenOptions: [
          usdcToken,
          solanaUsdcToken,
          tronNativeToken,
          bitcoinNativeToken,
        ],
        handleSelectDestStable,
        setActiveScreen,
      }),
    );

    render(<QuickBuyReceiveScreen />);

    expect(
      screen.getByTestId(`quick-buy-chain-filter-${SOLANA_CHAIN_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`quick-buy-chain-filter-${TRON_CHAIN_ID}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`quick-buy-chain-filter-${BITCOIN_CHAIN_ID}`),
    ).toBeOnTheScreen();
  });

  it('defaults the chain filter to Solana when the position is on Solana', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        target: {
          chain: SOLANA_CHAIN_ID,
          tokenAddress: `${SOLANA_CHAIN_ID}/slip44:501`,
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
        },
        sellDestTokenOptions: [usdcToken, solanaUsdcToken],
        selectedDestStable: solanaUsdcToken,
        handleSelectDestStable,
        setActiveScreen,
      }),
    );

    render(<QuickBuyReceiveScreen />);

    expect(screen.getByTestId(getRowTestId(solanaUsdcToken))).toBeOnTheScreen();
    expect(screen.queryByTestId(getRowTestId(usdcToken))).toBeNull();
  });
});
