import type { BridgeToken } from '../types';

/** Native ETH (mainnet) token used as default source in Bridge view tests. */
export const ETH_SOURCE: Pick<
  BridgeToken,
  'address' | 'chainId' | 'decimals' | 'symbol' | 'name'
> = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  decimals: 18,
  symbol: 'ETH',
  name: 'Ether',
};

/** USDC (mainnet) token used as default destination in Bridge view tests. */
export const USDC_DEST: Pick<
  BridgeToken,
  'address' | 'chainId' | 'decimals' | 'symbol' | 'name'
> = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

/** Default bridge slice values for view tests (source amount + source/dest tokens). */
export const DEFAULT_BRIDGE = {
  sourceAmount: '1',
  sourceToken: ETH_SOURCE,
  destToken: USDC_DEST,
} as const;
