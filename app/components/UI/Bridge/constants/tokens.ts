import { CaipAssetType } from '@metamask/utils';
import { BridgeToken } from '../types';

export const BridgeTokenMetadata: Record<CaipAssetType, BridgeToken> = {
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    chainId: '0x1',
  },
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    chainId: '0x1',
  },
  'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
    chainId: '0x2105',
  },
  'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831': {
    symbol: 'USDC',
    name: 'USD Coin (Native)',
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/42161/erc20/0xaf88d065e77c8cc2239327c5edb3a432268e5831.png',
    chainId: '0xa4b1',
  },
  'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/erc20/0x3c499c542cef5e3811e1192ce70d8cc03d5c3359.png',
    chainId: '0x89',
  },
};
