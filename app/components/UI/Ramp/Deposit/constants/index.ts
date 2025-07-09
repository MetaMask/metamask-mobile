import { CaipChainId } from '@metamask/utils';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon/index.ts';
import { brandColor } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../../util/theme/models.ts';

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

export interface DepositPaymentMethod {
  id: string;
  name: string;
  duration: 'instant' | '1_to_2_days';
  icon: IconName;
  iconColor?:
    | string
    | IconColor
    | { [AppThemeKey.light]: string; [AppThemeKey.dark]: string };
}

export interface DepositFiatCurrency {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
}

export interface DepositRegion {
  isoCode: string;
  flag: string;
  name: string;
  phone: {
    prefix: string;
    placeholder: string;
    template: string;
  };
  currency: string;
  supported: boolean;
  recommended?: boolean;
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

export const DEBIT_CREDIT_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit or Credit',
  duration: 'instant',
  icon: IconName.Card,
};

export const SEPA_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'sepa_bank_transfer',
  name: 'SEPA Bank Transfer',
  duration: '1_to_2_days',
  icon: IconName.Bank,
};

export const APPLE_PAY_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'apple_pay',
  name: 'Apple Pay',
  duration: 'instant',
  icon: IconName.Apple,
  iconColor: {
    light: brandColor.black,
    dark: brandColor.white,
  },
};

export const SUPPORTED_PAYMENT_METHODS: DepositPaymentMethod[] = [
  DEBIT_CREDIT_PAYMENT_METHOD,
  APPLE_PAY_PAYMENT_METHOD,
  SEPA_PAYMENT_METHOD,
];

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

export { DEPOSIT_REGIONS } from './regions.ts';
