import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

export const PREDICT_CURRENCY = 'usd';
export const PREDICT_MINIMUM_DEPOSIT = 0.01;

export const POLYGON_USDCE = {
  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex,
  decimals: 6,
  name: 'USD Coin (PoS)',
  symbol: 'USDC.e',
};

// TODO: Remove once predictDepositAndOrder is added to @metamask/transaction-controller
export const PREDICT_DEPOSIT_AND_ORDER_TYPE =
  'predictDepositAndOrder' as unknown as TransactionType;
