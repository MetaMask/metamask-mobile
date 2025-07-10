'use strict';

const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validateEmail = function (email: string) {
  if (!email || email.split('@').length !== 2) return false;
  return emailRegex.test(email);
};

export const formatUSPhoneNumber = (text: string) => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) {
    return `(${cleaned}`;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
    6,
    10,
  )}`;
};

import {
  DepositCryptoCurrency,
  DepositFiatCurrency,
  DepositPaymentMethod,
} from '../constants';

const TRANSAK_CRYPTO_IDS: Record<string, string> = {
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
  'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
};

const TRANSAK_FIAT_IDS: Record<string, string> = {
  USD: 'USD',
  EUR: 'EUR',
};

const TRANSAK_CHAIN_IDS: Record<string, string> = {
  'eip155:1': 'ethereum',
};

const TRANSAK_PAYMENT_METHOD_IDS: Record<string, string> = {
  credit_debit_card: 'credit_debit_card',
};

/**
 * Transforms our internal crypto currency ID to Transak crypto currency ID
 * @param cryptoCurrency - The crypto currency object
 * @returns The Transak crypto currency ID
 */
export function getTransakCryptoCurrencyId(
  cryptoCurrency: DepositCryptoCurrency,
): string {
  const transakId = TRANSAK_CRYPTO_IDS[cryptoCurrency.assetId];
  if (!transakId) {
    throw new Error(`Unsupported crypto currency: ${cryptoCurrency.assetId}`);
  }
  return transakId;
}

/**
 * Transforms our internal fiat currency ID to Transak fiat currency ID
 * @param fiatCurrency - The fiat currency object
 * @returns The Transak fiat currency ID
 */
export function getTransakFiatCurrencyId(
  fiatCurrency: DepositFiatCurrency,
): string {
  const transakId = TRANSAK_FIAT_IDS[fiatCurrency.id];
  if (!transakId) {
    throw new Error(`Unsupported fiat currency: ${fiatCurrency.id}`);
  }
  return transakId;
}

/**
 * Transforms our internal chain ID to Transak chain ID
 * @param chainId - The chain ID
 * @returns The Transak chain ID
 */
export function getTransakChainId(chainId: string): string {
  const transakId = TRANSAK_CHAIN_IDS[chainId];
  if (!transakId) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return transakId;
}

/**
 * Transforms our internal payment method ID to Transak payment method ID
 * @param paymentMethod - The payment method object
 * @returns The Transak payment method ID
 */
export function getTransakPaymentMethodId(
  paymentMethod: DepositPaymentMethod,
): string {
  const transakId = TRANSAK_PAYMENT_METHOD_IDS[paymentMethod.id];
  if (!transakId) {
    throw new Error(`Unsupported payment method: ${paymentMethod.id}`);
  }
  return transakId;
}
