import BigNumber from 'bignumber.js';
import formatFiat from '../../../../../util/formatFiat';
import {
  MAX_MULTIPACK_COUNT,
  USDC_DECIMALS,
} from '../../providers/pack-partner/constants';

/** USD presentation without converting base-unit balances through Number. */
export const formatPurchaseAmount = (amount: bigint): string =>
  formatFiat(new BigNumber(amount.toString()).shiftedBy(-USDC_DECIMALS), 'USD');

/** Max preset respects both the available USDC and the feature's pack limit. */
export const getMaximumAffordableQuantity = (
  balance: bigint,
  unitPrice: bigint,
): number => {
  if (balance <= 0n || unitPrice <= 0n) return 0;
  const affordable = balance / unitPrice;
  return affordable >= BigInt(MAX_MULTIPACK_COUNT)
    ? MAX_MULTIPACK_COUNT
    : Number(affordable);
};

/** Persisted/repeated purchase options must be whole quantities in range. */
export const normalizePurchaseQuantity = (quantity = 1): number =>
  Number.isFinite(quantity)
    ? Math.min(MAX_MULTIPACK_COUNT, Math.max(1, Math.floor(quantity)))
    : 1;
