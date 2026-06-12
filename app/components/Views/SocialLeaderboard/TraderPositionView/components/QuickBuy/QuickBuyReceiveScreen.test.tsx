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

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToHex: () => '0x1',
  isNonEvmChainId: () => false,
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

const usdcToken = createToken({ symbol: 'USDC', chainId: '0x1' });
const usdtToken = createToken({
  symbol: 'USDT',
  chainId: '0x1',
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
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
});
