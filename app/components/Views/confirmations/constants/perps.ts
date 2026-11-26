import { Hex } from '@metamask/utils';

export const PERPS_CURRENCY = 'usd';
export const PERPS_MINIMUM_DEPOSIT = 0.01;
/** Lighter's minimum direct L1 USDC deposit to perps. */
export const LIGHTER_MINIMUM_DEPOSIT = 1;
/** Flat USD fee Lighter charges on a withdraw. */
export const LIGHTER_WITHDRAW_FEE = 1;
/** Smallest withdraw the user can enter: the fee plus at least 1 USD received. */
export const LIGHTER_MINIMUM_WITHDRAW = 2;

export const ARBITRUM_USDC = {
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
};
