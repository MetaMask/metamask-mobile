import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';

export type MockDepositCryptoCurrency = DepositCryptoCurrency & {
  unsupported?: boolean;
};

export const MOCK_USDC_TOKEN: MockDepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

export const MOCK_USDT_TOKEN: MockDepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: 'eip155:1',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
  unsupported: true,
};

export const MOCK_BTC_TOKEN: MockDepositCryptoCurrency = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  name: 'Bitcoin',
  symbol: 'BTC',
  decimals: 8,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
  unsupported: true,
};

export const MOCK_ETH_TOKEN: MockDepositCryptoCurrency = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
};

export const MOCK_USDC_SOLANA_TOKEN: MockDepositCryptoCurrency = {
  assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
};

export const MOCK_CRYPTOCURRENCIES: MockDepositCryptoCurrency[] = [
  MOCK_USDC_TOKEN,
  MOCK_USDT_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_ETH_TOKEN,
  MOCK_USDC_SOLANA_TOKEN,
];
