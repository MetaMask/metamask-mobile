import Logger from '../../../../util/Logger';
import type { Quote } from '../types';

export type TransakQuoteMismatchCategory = 'fiat_amount';

export function logTransakQuoteMismatch(
  mismatches: TransakQuoteMismatchCategory[],
): void {
  if (mismatches.length === 0) {
    return;
  }

  Logger.error(
    new Error('Transak quote differs from accepted quote'),
    `Transak quote parity mismatch: ${mismatches.join(',')}`,
  );
}

function cents(value: unknown): number | null {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : null;
}

export function acceptedAmountMatchesRequest(
  quote: Quote,
  requestedAmount: number,
): boolean {
  const acceptedAmount = cents(
    (quote.quote as Quote['quote'] & { amountIn?: number | string }).amountIn,
  );
  const requestedAmountInCents = cents(requestedAmount);
  return (
    acceptedAmount !== null &&
    requestedAmountInCents !== null &&
    acceptedAmount === requestedAmountInCents
  );
}
