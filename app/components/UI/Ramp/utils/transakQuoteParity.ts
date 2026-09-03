import type { TransakBuyQuote } from '@metamask/ramps-controller';
import BigNumber from 'bignumber.js';
import Logger from '../../../../util/Logger';
import type { Quote } from '../types';

export type TransakQuoteMismatchCategory =
  | 'asset'
  | 'payment_method'
  | 'fiat_amount'
  | 'crypto_amount'
  | 'provider_fee'
  | 'network_fee'
  | 'partner_fee'
  | 'fee_total'
  | 'fee_breakdown';

export class QuoteChangedError extends Error {
  readonly headlessBuyErrorCode = 'QUOTE_CHANGED';
  readonly mismatchCategories: TransakQuoteMismatchCategory[];

  constructor(mismatchCategories: TransakQuoteMismatchCategory[]) {
    super('The Transak quote changed before checkout');
    this.name = 'QuoteChangedError';
    this.mismatchCategories = mismatchCategories;
  }
}

interface AcceptedQuoteDetails {
  amountIn: number | string;
  amountOut: number | string;
  paymentMethod: string;
  providerFee?: number | string;
  networkFee?: number | string;
}

interface AcceptedQuote extends Quote {
  outputCurrency?: { assetId?: string };
  quote: Quote['quote'] & AcceptedQuoteDetails;
}

const FEE_IDS = {
  network: 'network_fee',
  partner: 'partner_fee',
  provider: 'transak_fee',
} as const;

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

function nonNegativeDecimal(value: unknown): BigNumber | null {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return null;
  }
  const amount = new BigNumber(value);
  return amount.isFinite() && amount.isGreaterThanOrEqualTo(0) ? amount : null;
}

function acceptedFeeCents(value: number | string | undefined): number | null {
  return value === undefined ? 0 : cents(value);
}

function normalizePaymentMethod(paymentMethod: string): string {
  const normalized = paymentMethod
    .replace(/^\/payments\//u, '')
    .replace(/-/gu, '_');
  return normalized === 'debit_credit_card' ? 'credit_debit_card' : normalized;
}

function addMismatch(
  mismatches: TransakQuoteMismatchCategory[],
  category: TransakQuoteMismatchCategory,
  matches: boolean,
): void {
  if (!matches && !mismatches.includes(category)) {
    mismatches.push(category);
  }
}

/**
 * Verifies that the authenticated native quote still matches the accepted
 * fee-inclusive ramps quote. Transak documents `transak_fee`, `network_fee`,
 * and `partner_fee` as the stable fee component identifiers. Any unknown
 * charged component fails closed because it cannot be reconciled with the
 * fee row shown before checkout.
 */
export function assertTransakFeeInclusiveParity(
  acceptedQuote: Quote,
  nativeQuote: TransakBuyQuote,
  context: {
    assetId: string;
    paymentMethod: string;
  },
): void {
  const accepted = acceptedQuote as AcceptedQuote;
  const mismatches: TransakQuoteMismatchCategory[] = [];
  const acceptedAssetId = accepted.outputCurrency?.assetId ?? context.assetId;
  const expectedChainId = context.assetId.split('/')[0];
  const requestedAssetMatches =
    typeof nativeQuote.requestedAssetId === 'string' &&
    nativeQuote.requestedAssetId.toLowerCase() ===
      context.assetId.toLowerCase();
  const requestedChainMatches =
    typeof nativeQuote.requestedChainId === 'string' &&
    nativeQuote.requestedChainId.toLowerCase() ===
      expectedChainId.toLowerCase();
  const nativeAssetMatches =
    typeof nativeQuote.cryptoCurrency === 'string' &&
    nativeQuote.cryptoCurrency.toUpperCase() === 'MUSD' &&
    typeof nativeQuote.network === 'string' &&
    nativeQuote.network.toLowerCase() === 'monad';

  addMismatch(
    mismatches,
    'asset',
    acceptedAssetId.toLowerCase() === context.assetId.toLowerCase() &&
      requestedAssetMatches &&
      requestedChainMatches &&
      nativeAssetMatches,
  );
  addMismatch(
    mismatches,
    'payment_method',
    normalizePaymentMethod(accepted.quote.paymentMethod) ===
      normalizePaymentMethod(context.paymentMethod) &&
      typeof nativeQuote.paymentMethod === 'string' &&
      normalizePaymentMethod(nativeQuote.paymentMethod) ===
        normalizePaymentMethod(context.paymentMethod),
  );
  addMismatch(
    mismatches,
    'fiat_amount',
    cents(accepted.quote.amountIn) !== null &&
      cents(accepted.quote.amountIn) === cents(nativeQuote.fiatAmount),
  );
  const acceptedCryptoAmount = nonNegativeDecimal(accepted.quote.amountOut);
  const nativeCryptoAmount = nonNegativeDecimal(nativeQuote.cryptoAmount);
  addMismatch(
    mismatches,
    'crypto_amount',
    acceptedCryptoAmount !== null &&
      nativeCryptoAmount !== null &&
      acceptedCryptoAmount.isEqualTo(nativeCryptoAmount),
  );

  const components = new Map<string, number>();
  let malformedBreakdown = !Array.isArray(nativeQuote.feeBreakdown);
  if (Array.isArray(nativeQuote.feeBreakdown)) {
    for (const component of nativeQuote.feeBreakdown) {
      const id = typeof component?.id === 'string' ? component.id : '';
      const value = cents(
        typeof component?.value === 'string' ||
          typeof component?.value === 'number'
          ? component.value
          : undefined,
      );
      if (!id || value === null) {
        malformedBreakdown = true;
        continue;
      }
      components.set(id, (components.get(id) ?? 0) + value);
    }
  }

  const providerFee = acceptedFeeCents(accepted.quote.providerFee);
  const networkFee = acceptedFeeCents(accepted.quote.networkFee);
  const nativeProviderFee = components.get(FEE_IDS.provider) ?? 0;
  const nativeNetworkFee = components.get(FEE_IDS.network) ?? 0;
  const nativePartnerFee = components.get(FEE_IDS.partner) ?? 0;
  const unknownChargedComponent = [...components].some(
    ([id, value]) =>
      !Object.values(FEE_IDS).includes(
        id as (typeof FEE_IDS)[keyof typeof FEE_IDS],
      ) && value > 0,
  );
  const breakdownTotal = [...components.values()].reduce(
    (total, value) => total + value,
    0,
  );
  const acceptedTotal =
    providerFee === null || networkFee === null
      ? null
      : providerFee + networkFee;

  addMismatch(
    mismatches,
    'provider_fee',
    providerFee !== null && providerFee === nativeProviderFee,
  );
  addMismatch(
    mismatches,
    'network_fee',
    networkFee !== null && networkFee === nativeNetworkFee,
  );
  addMismatch(mismatches, 'partner_fee', nativePartnerFee === 0);
  addMismatch(
    mismatches,
    'fee_breakdown',
    !malformedBreakdown && !unknownChargedComponent,
  );
  addMismatch(
    mismatches,
    'fee_total',
    acceptedTotal !== null &&
      acceptedTotal === cents(nativeQuote.totalFee) &&
      acceptedTotal === breakdownTotal,
  );

  if (mismatches.length > 0) {
    Logger.error(
      new QuoteChangedError(mismatches),
      `Transak quote parity mismatch: ${mismatches.join(',')}`,
    );
    throw new QuoteChangedError(mismatches);
  }
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
