import type { Hex } from '@metamask/utils';

export const PREDICT_BALANCE_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000000001' as Hex;

export const PREDICT_BALANCE_CHAIN_ID = '0x89' as Hex;

export const MINIMUM_BET = 1; // $1 minimum bet

// MINIMUM_BET + combined fees (2% MetaMask + 2% provider ≈ $0.05 on $1)
export const MINIMUM_PREDICT_BALANCE_FOR_BET = 1.05;

export const PREDICT_BALANCE_TOKEN_KEY = 'predict-balance';

export const PREDICTION_ERROR_TRANSACTION_BATCH_ID = 'NA';
