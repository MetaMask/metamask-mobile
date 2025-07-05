import { CaipChainId, SolScope } from '@metamask/keyring-api';
import { BridgeToken } from '../types';
import { Hex } from '@metamask/utils';


export const DefaultSwapDestTokens: Record<Hex | CaipChainId, BridgeToken> = {
  '0x1': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    chainId: '0x1',
  },
  '0xa': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/10/0x0b2c639c533813f4aa9d7837caf62653d097ff85.png',
    chainId: '0xa',
  },
  '0x56': {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x55d398326f99059ff775485246999027b3197955',
    decimals: 18,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x55d398326f99059ff775485246999027b3197955.png',
    chainId: '0x56',
  },
  '0x137': {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/137/0xc2132d05d31c914a87c6611c10748aeb04b58e8f.png',
    chainId: '0x137',
  },
  '0xa4b1': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/42161/0xaf88d065e77c8cc2239327c5edb3a432268e5831.png',
    chainId: '0xa4b1',
  },
  '0xa86a': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/43114/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e.png',
    chainId: '0xa86a',
  },
  '0x2105': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
    chainId: '0x2105',
  },
  '0xe708': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x176211869ca2b568f2a7d4ee941e073a821ee1ff.png',
    chainId: '0xe708',
  },
  '0x144': {
    symbol: 'USDT',
    name: 'USD Coin',
    address: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/324/0x493257fd37edb34451f62edf8d2a0c418852ba4c.png',
    chainId: '0x144',
  },
  [SolScope.Mainnet]: {
    address:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
    chainId: SolScope.Mainnet,
  },
};
