import type { Hex } from '@metamask/utils';

export const PREDICT_BALANCE_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000000001' as Hex;

export const PREDICT_BALANCE_CHAIN_ID = '0x89' as Hex;

export const MINIMUM_BET = 1; // $1 minimum bet

// Keeps the CTA locked long enough for the payment selector to close and the
// new quote-loading state to arrive, while avoiding a laggy return to the buy
// sheet after normal blur/focus navigation.
export const PAYMENT_SELECTOR_NAVIGATION_UNLOCK_DELAY_MS = 1000;

// Fallback recovery if the payment-selector route does not emit the expected
// blur/focus events, such as transparent modal or interrupted navigation cases.
export const PAYMENT_SELECTOR_NAVIGATION_SAFETY_UNLOCK_MS = 5000;

export const PREDICT_BALANCE_TOKEN_KEY = 'predict-balance';

export const PREDICTION_ERROR_TRANSACTION_BATCH_ID = 'NA';
