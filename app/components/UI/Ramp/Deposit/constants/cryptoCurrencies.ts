import { CaipChainId } from '@metamask/utils';

export interface DepositCryptoCurrency {
  assetId: string;
  logo: string;
  name: string;
  chainId: CaipChainId;
  address: string;
  decimals: number;
  iconUrl: string;
  symbol: string;
}

export const USDC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  logo: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

export const USDT_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: 'eip155:1',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  logo: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
};

export const SUPPORTED_DEPOSIT_TOKENS: DepositCryptoCurrency[] = [
  USDC_TOKEN,
  USDT_TOKEN,
]; 