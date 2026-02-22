import {
  BtcScope,
  CaipChainId,
  SolScope,
  TrxScope,
} from '@metamask/keyring-api';
import { BridgeToken } from '../types';
import { CaipAssetType, Hex } from '@metamask/utils';
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
  [CHAIN_IDS.SEI]: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/1329/0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392.png',
    chainId: CHAIN_IDS.SEI,
  },
  [CHAIN_IDS.MONAD]: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/143/0x754704Bc059F8C67012fEd69BC8A327a5aafb603.png',
    chainId: CHAIN_IDS.MONAD,
  },
  [SolScope.Mainnet]: {
    address:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
    chainId: SolScope.Mainnet,
  },
  [TrxScope.Mainnet]: {
    address: 'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/tron/728126428/trc20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t.png',
    chainId: TrxScope.Mainnet,
  },
};

export const Bip44TokensForDefaultPairs: Record<CaipAssetType, BridgeToken> = {
  'bip122:000000000019d6689c085ae165831e93/slip44:0': {
    symbol: 'BTC',
    name: 'Bitcoin',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 8,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
    chainId: BtcScope.Mainnet,
  },
  'eip155:1/slip44:60': {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
    chainId: CHAIN_IDS.MAINNET,
  },
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    chainId: CHAIN_IDS.MAINNET,
  },
  'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
    symbol: 'mUSD',
    name: 'MetaMask USD',
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
    chainId: CHAIN_IDS.MAINNET,
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
    address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    decimals: 9,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
    chainId: SolScope.Mainnet,
    name: 'Solana',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
    {
      address:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      decimals: 6,
      image:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
      chainId: SolScope.Mainnet,
      name: 'USD Coin',
    },
  'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t': {
    address: 'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    symbol: 'USDT',
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/tron/728126428/trc20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t.png',
    chainId: TrxScope.Mainnet,
    name: 'Tether USD',
  },
};
