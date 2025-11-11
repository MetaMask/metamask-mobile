import { BigNumber } from 'bignumber.js';

/**
 * Minimum transaction amount for Bitcoin in BTC.
 * Bitcoin network requires a minimum of 0.0001 BTC (10,000 satoshis) for transactions.
 */
export const MINIMUM_BITCOIN_TRANSACTION_AMOUNT = new BigNumber('0.0001');
