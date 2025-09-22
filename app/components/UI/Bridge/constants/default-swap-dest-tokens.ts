import { CaipChainId, SolScope } from '@metamask/keyring-api';
import { BridgeToken } from '../types';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export const DefaultSwapDestTokens: Record<Hex | CaipChainId, BridgeToken> = {
  [CHAIN_IDS.MAINNET]: {
    symbol: 'mUSD',
    name: 'MetaMask USD',
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
    chainId: CHAIN_IDS.MAINNET,
  },
  [CHAIN_IDS.OPTIMISM]: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/10/0x0b2c639c533813f4aa9d7837caf62653d097ff85.png',
    chainId: CHAIN_IDS.OPTIMISM,
  },
  [CHAIN_IDS.BSC]: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x55d398326f99059ff775485246999027b3197955',
    decimals: 18,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x55d398326f99059ff775485246999027b3197955.png',
    chainId: CHAIN_IDS.BSC,
  },
  [CHAIN_IDS.POLYGON]: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/137/0xc2132d05d31c914a87c6611c10748aeb04b58e8f.png',
    chainId: CHAIN_IDS.POLYGON,
  },
  [CHAIN_IDS.ARBITRUM]: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/42161/0xaf88d065e77c8cc2239327c5edb3a432268e5831.png',
    chainId: CHAIN_IDS.ARBITRUM,
  },
  [CHAIN_IDS.AVALANCHE]: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/43114/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e.png',
    chainId: CHAIN_IDS.AVALANCHE,
  },
  [CHAIN_IDS.BASE]: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
    chainId: CHAIN_IDS.BASE,
  },
  [CHAIN_IDS.LINEA_MAINNET]: {
    symbol: 'mUSD',
    name: 'MetaMask USD',
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
    chainId: CHAIN_IDS.LINEA_MAINNET,
  },
  [CHAIN_IDS.ZKSYNC_ERA]: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/324/0x493257fd37edb34451f62edf8d2a0c418852ba4c.png',
    chainId: CHAIN_IDS.ZKSYNC_ERA,
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
