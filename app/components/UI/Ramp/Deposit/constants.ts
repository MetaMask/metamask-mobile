export const FIAT_CURRENCIES = ['USD', 'EUR'];

export type DepositCryptoCurrency = {
  id: string;
  logo: string;
  name: string;
  chainId: string;
  symbol: string;
};

export type DepositPaymentMethod = {
  id: string;
  name: string;
  duration: string;
};

export type DepositFiatCurrency = {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
};

export const USDC_TOKEN: DepositCryptoCurrency = {
  id: 'usdc',
  logo: 'https://dev-static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  name: 'USDC',
  chainId: '1',
  symbol: 'USDC',
};

export const DEBIT_CREDIT_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit or Credit',
  duration: 'Instant',
};

export const USD_CURRENCY: DepositFiatCurrency = {
  id: 'USD',
  name: 'US Dollar',
  symbol: '$',
  emoji: '🇺🇸',
};

export const EUR_CURRENCY: DepositFiatCurrency = {
  id: 'EUR',
  name: 'Euro',
  symbol: '€',
  emoji: '🇪🇺',
};

import { CaipChainId } from '@metamask/utils';

export const TRANSAK_NETWORKS: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
};
