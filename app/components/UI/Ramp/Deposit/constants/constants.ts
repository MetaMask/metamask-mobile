import { CaipChainId } from '@metamask/utils';

export interface DepositFiatCurrency {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
}

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

export const TRANSAK_NETWORKS: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
};

export const TRANSAK_SUPPORT_URL = 'https://support.transak.com'; 