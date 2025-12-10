import type { BridgeState } from '../../../../core/redux/slices/bridge';
import { BridgeViewMode } from '../types';

export const mockBridgeReducerState: BridgeState = {
  sourceAmount: '1000000000000000000',
  destAmount: undefined,
  sourceToken: {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    image: 'https://example.com/image.png',
    name: 'Ethereum',
    symbol: 'ETH',
    balance: '1.0',
    balanceFiat: '$2000',
    chainId: '0x1',
  },
  destToken: {
    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    decimals: 6,
    image: 'https://example.com/image.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '0',
    balanceFiat: '$0',
    chainId: '0xa',
  },
  destAddress: undefined,
  selectedSourceChainIds: ['0x1'],
  selectedDestChainId: '0xa',
  slippage: '0.5',
  isSubmittingTx: false,
  isGasIncludedSTXSendBundleSupported: false,
  isGasIncluded7702Supported: false,
  bridgeViewMode: BridgeViewMode.Bridge,
  isSelectingRecipient: false,
};
