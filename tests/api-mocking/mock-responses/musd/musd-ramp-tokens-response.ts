/**
 * Ramp tokens response for mUSD conversion E2E mocks.
 * Used by on-ramp-cache regions/tokens endpoint.
 */

import { USDC_MAINNET, MUSD_MAINNET } from '../../../constants/musd-mainnet.ts';

export const MUSD_RAMP_TOKENS_RESPONSE = {
  topTokens: [
    {
      assetId: `eip155:1/erc20:${MUSD_MAINNET}`,
      chainId: 'eip155:1',
      symbol: 'MUSD',
      name: 'MetaMask USD',
      decimals: 6,
      tokenSupported: true,
    },
  ],
  allTokens: [
    {
      assetId: `eip155:1/erc20:${MUSD_MAINNET}`,
      chainId: 'eip155:1',
      symbol: 'MUSD',
      name: 'MetaMask USD',
      decimals: 6,
      tokenSupported: true,
    },
    {
      assetId: `eip155:1/erc20:${USDC_MAINNET}`,
      chainId: 'eip155:1',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      tokenSupported: true,
    },
  ],
};
