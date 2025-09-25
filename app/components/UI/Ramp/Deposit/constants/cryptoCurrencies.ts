import { CaipAssetReference, CaipChainId } from '@metamask/utils';
import {
  BASE_MAINNET,
  BSC_MAINNET,
  ETHEREUM_MAINNET,
  LINEA_MAINNET,
  SOLANA_MAINNET,
} from './networks';

export interface DepositCryptoCurrency {
  assetId: CaipAssetReference;
  name: string;
  chainId: CaipChainId;
  decimals: number;
  iconUrl: string;
  symbol: string;
}

export const MUSD_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  chainId: ETHEREUM_MAINNET.chainId,
  name: 'MetaMask USD',
  symbol: 'mUSD',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
};

export const MUSD_LINEA_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  chainId: LINEA_MAINNET.chainId,
  name: 'MetaMask USD',
  symbol: 'mUSD',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
};

export const USDC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: ETHEREUM_MAINNET.chainId,
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

export const USDC_LINEA_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:59144/erc20:0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
  chainId: LINEA_MAINNET.chainId,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0x176211869ca2b568f2a7d4ee941e073a821ee1ff.png',
};

export const USDC_BASE_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  chainId: BASE_MAINNET.chainId,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
};

export const USDC_BSC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  chainId: BSC_MAINNET.chainId,
  decimals: 18,
  name: 'USD Coin',
  symbol: 'USDC',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.png',
};

export const USDC_SOLANA_TOKEN: DepositCryptoCurrency = {
  assetId:
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  chainId: SOLANA_MAINNET.chainId,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
};

export const USDT_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: ETHEREUM_MAINNET.chainId,
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
};

export const USDT_LINEA_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93',
  chainId: LINEA_MAINNET.chainId,
  decimals: 6,
  name: 'Tether USD',
  symbol: 'USDT',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xa219439258ca9da29e9cc4ce5596924745e12b93.png',
};

export const USDT_BASE_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:8453/erc20:0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
  chainId: BASE_MAINNET.chainId,
  decimals: 6,
  name: 'Tether USD',
  symbol: 'USDT',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0xfde4c96c8593536e31f229ea8f37b2ada2699bb2.png',
};

export const USDT_BSC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
  chainId: BSC_MAINNET.chainId,
  decimals: 18,
  name: 'Tether USD',
  symbol: 'USDT',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/0x55d398326f99059ff775485246999027b3197955.png',
};

export const USDT_SOLANA_TOKEN: DepositCryptoCurrency = {
  assetId:
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  chainId: SOLANA_MAINNET.chainId,
  decimals: 6,
  name: 'Tether USD',
  symbol: 'USDT',
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB.png',
};

export const ETH_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/slip44:60',
  chainId: ETHEREUM_MAINNET.chainId,
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
};

export const ALL_DEPOSIT_TOKENS: DepositCryptoCurrency[] = [
  MUSD_TOKEN,
  ETH_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  MUSD_LINEA_TOKEN,
  USDC_LINEA_TOKEN,
  USDT_LINEA_TOKEN,
  USDC_BSC_TOKEN,
  USDT_BSC_TOKEN,
  USDC_BASE_TOKEN,
  USDT_BASE_TOKEN,
  USDC_SOLANA_TOKEN,
  USDT_SOLANA_TOKEN,
];

export const CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS: DepositCryptoCurrency[] = [
  USDC_LINEA_TOKEN,
  USDC_BASE_TOKEN,
  USDC_SOLANA_TOKEN,
  USDT_LINEA_TOKEN,
  USDT_BASE_TOKEN,
  USDT_SOLANA_TOKEN,
];

export const SUPPORTED_DEPOSIT_TOKENS: DepositCryptoCurrency[] = [
  // MUSD_TOKEN,
  // MUSD_LINEA_TOKEN,
  USDC_TOKEN,
  ETH_TOKEN,
  // USDC_LINEA_TOKEN,
  // USDC_BASE_TOKEN,
  USDC_BSC_TOKEN,
  // USDC_SOLANA_TOKEN,
  USDT_TOKEN,
  // USDT_LINEA_TOKEN,
  // USDT_BASE_TOKEN,
  USDT_BSC_TOKEN,
  // USDT_SOLANA_TOKEN, // currently not supported on Transak
];
