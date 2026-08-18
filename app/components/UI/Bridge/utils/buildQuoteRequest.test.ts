import type { Hex } from '@metamask/utils';

import type { BridgeToken } from '../types';
import { buildQuoteRequest } from './buildQuoteRequest';

const ethToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
};

const usdcToken: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const createConfig = (
  overrides: {
    sourceToken?: Pick<BridgeToken, 'address' | 'chainId'>;
    destToken?: Pick<BridgeToken, 'address' | 'chainId'>;
    srcTokenAmount?: string;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
    gasIncluded?: boolean;
    gasIncluded7702?: boolean;
    insufficientBal?: boolean;
  } = {},
) => ({
  sourceToken: ethToken,
  destToken: usdcToken,
  srcTokenAmount: '1500000000000000000',
  walletAddress: '0x1234567890123456789012345678901234567890',
  ...overrides,
});

describe('buildQuoteRequest', () => {
  it('builds a unified quote request with gas and balance fields', () => {
    const config = createConfig({
      slippage: '0.5',
      destWalletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      gasIncluded: true,
      gasIncluded7702: true,
      insufficientBal: true,
    });

    const result = buildQuoteRequest(config);

    expect(result).toEqual({
      srcChainId: '1',
      srcTokenAddress: ethToken.address,
      destChainId: '1',
      destTokenAddress: usdcToken.address,
      srcTokenAmount: '1500000000000000000',
      slippage: 0.5,
      walletAddress: config.walletAddress,
      destWalletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      gasIncluded: true,
      gasIncluded7702: true,
      insufficientBal: true,
    });
  });

  it('omits gas and balance fields when they are not provided', () => {
    const config = createConfig();

    const result = buildQuoteRequest(config);

    expect(result).toEqual({
      srcChainId: '1',
      srcTokenAddress: ethToken.address,
      destChainId: '1',
      destTokenAddress: usdcToken.address,
      srcTokenAmount: '1500000000000000000',
      slippage: undefined,
      walletAddress: config.walletAddress,
      destWalletAddress: config.walletAddress,
    });
  });

  it('omits slippage when slippage is an empty string', () => {
    const config = createConfig({ slippage: '' });

    const result = buildQuoteRequest(config);

    expect(result.slippage).toBeUndefined();
  });

  it('keeps zero slippage when slippage is 0', () => {
    const config = createConfig({ slippage: '0' });

    const result = buildQuoteRequest(config);

    expect(result.slippage).toBe(0);
  });
});
