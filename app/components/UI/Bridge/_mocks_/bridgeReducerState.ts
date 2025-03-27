import { ChainId } from '@metamask/controller-utils';
import type { BridgeState } from '../../../../core/redux/slices/bridge';

export const mockBridgeReducerState: BridgeState = {
  sourceAmount: undefined,
  destAmount: undefined,
  sourceToken: {
    address: '0x0000000000000000000000000000000000000000',
    aggregators: [],
    decimals: 18,
    image: 'https://example.com/image.png',
    name: 'Ethereum',
    symbol: 'ETH',
    balance: '1.0',
    balanceFiat: '$2000',
    logo: undefined,
    isETH: true,
    chainId: '0x1',
  },
  destToken: {
    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    aggregators: [],
    decimals: 6,
    image: 'https://example.com/image.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '0',
    balanceFiat: '$0',
    logo: undefined,
    isETH: false,
    chainId: ChainId['linea-mainnet'],
  },
  selectedSourceChainIds: ['0x1'],
  selectedDestChainId: '0x89',
  slippage: '0.5',
};
