import type { TransakBuyQuote } from '@metamask/ramps-controller';
import type { Quote } from '../types';

type FeeMode = 'fee-inclusive' | 'fee-on-top';

type QuoteWithParityFields = Quote & {
  quote: Quote['quote'] & {
    crypto?: {
      symbol?: string;
      network?: { chainName?: string; shortName?: string };
    };
    fiat?: { symbol?: string };
    fiatId?: string;
    providerFee?: number | string;
    networkFee?: number | string;
    extraFee?: number | string;
    totalFees?: number | string;
    feeMode?: {
      requested?: FeeMode;
      effective?: FeeMode;
    };
  };
};

type NativeFeeBreakdown = Record<string, string | number | boolean | null>;
type NativeQuoteWithParityFields = TransakBuyQuote & {
  feeMode?: {
    requested?: FeeMode;
    effective?: FeeMode;
  };
};

export class QuoteChangedError extends Error {
  readonly headlessBuyErrorCode = 'QUOTE_CHANGED';
  readonly code = 'QUOTE_CHANGED';
  readonly details: Record<string, unknown>;

  constructor(details: Record<string, unknown>) {
    super('The Transak quote changed. Confirm a fresh quote to continue.');
    this.name = 'QuoteChangedError';
    this.details = details;
  }
}

export function getEffectiveFeeMode(quote: Quote): FeeMode {
  return (
    (quote as QuoteWithParityFields).quote?.feeMode?.effective ??
    'fee-inclusive'
  );
}

export function hasExplicitFeeMode(quote: Quote): boolean {
  return Boolean((quote as QuoteWithParityFields).quote?.feeMode?.effective);
}

function parseMoney(
  value: number | string | undefined,
  missingValue?: number,
): number | undefined {
  if (value === undefined) {
    return missingValue;
  }
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/gu, '');
}

export function normalizeTransakPaymentMethod(
  paymentMethod: string | undefined,
): string {
  const normalized = normalize(
    paymentMethod?.replace(/^\/payments\//u, '').replaceAll('-', '_'),
  );
  if (normalized === 'debitcreditcard' || normalized === 'card') {
    return 'creditdebitcard';
  }
  return normalized;
}

function readBreakdownIdentifier(item: NativeFeeBreakdown): string {
  for (const key of ['id', 'name', 'type', 'label', 'feeType']) {
    const value = item[key];
    if (typeof value === 'string') {
      return normalize(value);
    }
  }
  return '';
}

function readBreakdownAmount(item: NativeFeeBreakdown): number | undefined {
  for (const key of ['value', 'amount', 'feeAmount']) {
    const value = item[key];
    if (typeof value === 'number' || typeof value === 'string') {
      return parseMoney(value);
    }
  }
  return undefined;
}

function getNativeFeeComponents(quote: TransakBuyQuote): {
  provider: number;
  network: number;
  extra: number;
  complete: boolean;
} {
  const components = { provider: 0, network: 0, extra: 0, complete: true };
  for (const rawItem of quote.feeBreakdown ?? []) {
    const item = rawItem as NativeFeeBreakdown;
    const identifier = readBreakdownIdentifier(item);
    const amount = readBreakdownAmount(item);
    if (!identifier) {
      components.complete = false;
      continue;
    }
    if (amount === undefined) {
      components.complete = false;
      continue;
    }
    if (identifier === 'networkfee' || identifier === 'gasfee') {
      components.network += amount;
    } else if (
      identifier === 'partnerfee' ||
      identifier === 'extrafee' ||
      identifier === 'metamaskfee'
    ) {
      components.extra += amount;
    } else if (
      identifier === 'transakfee' ||
      identifier === 'providerfee' ||
      identifier === 'processingfee'
    ) {
      components.provider += amount;
    } else {
      components.complete = false;
    }
  }
  return components;
}

export function assertTransakQuoteParity(
  acceptedQuote: Quote,
  nativeQuote: TransakBuyQuote,
  expected: {
    currency: string;
    paymentMethod: string;
  },
): void {
  const accepted = acceptedQuote as QuoteWithParityFields;
  const native = nativeQuote as NativeQuoteWithParityFields;
  const providerFee = parseMoney(accepted.quote.providerFee, 0);
  const networkFee = parseMoney(accepted.quote.networkFee, 0);
  const extraFee = parseMoney(accepted.quote.extraFee, 0);
  const reportedTotalFees = parseMoney(accepted.quote.totalFees);
  const principal = parseMoney(accepted.quote.amountIn);
  const nativePrincipal = parseMoney(nativeQuote.fiatAmount);
  const nativeTotalFee = parseMoney(nativeQuote.totalFee);
  const nativeFees = getNativeFeeComponents(nativeQuote);
  const componentTotal =
    providerFee === undefined ||
    networkFee === undefined ||
    extraFee === undefined
      ? undefined
      : providerFee + networkFee + extraFee;
  const totalFees = reportedTotalFees ?? componentTotal;
  const expectedMethod = normalizeTransakPaymentMethod(
    accepted.quote.paymentMethod || expected.paymentMethod,
  );
  const nativeMethod = normalizeTransakPaymentMethod(nativeQuote.paymentMethod);

  const mismatches: string[] = [];
  if (normalize(nativeQuote.fiatCurrency) !== normalize(expected.currency)) {
    mismatches.push('fiat');
  }
  // Transak does not return stable CAIP asset or chain identifiers. Request
  // identifiers attached by Core only describe the request, so they are not
  // used as evidence about the response. Provider display names are also too
  // unstable for a security-sensitive parity decision.
  const convertedPrincipal =
    Number(nativeQuote.cryptoAmount) * Number(nativeQuote.conversionPrice);
  if (
    native.feeMode?.effective !== 'fee-on-top' ||
    !Number.isFinite(convertedPrincipal) ||
    nativePrincipal === undefined ||
    cents(convertedPrincipal) !== cents(nativePrincipal)
  ) {
    mismatches.push('feeMode');
  }
  if (!expectedMethod || nativeMethod !== expectedMethod) {
    mismatches.push('paymentMethod');
  }
  if (
    principal === undefined ||
    nativePrincipal === undefined ||
    cents(principal) !== cents(nativePrincipal)
  ) {
    mismatches.push('principal');
  }
  if (
    providerFee === undefined ||
    networkFee === undefined ||
    extraFee === undefined ||
    totalFees === undefined ||
    nativeTotalFee === undefined ||
    principal === undefined ||
    nativePrincipal === undefined ||
    !nativeFees.complete
  ) {
    mismatches.push('fees');
  } else {
    if (cents(providerFee) !== cents(nativeFees.provider)) {
      mismatches.push('providerFee');
    }
    if (cents(networkFee) !== cents(nativeFees.network)) {
      mismatches.push('networkFee');
    }
    if (cents(extraFee) !== cents(nativeFees.extra)) {
      mismatches.push('extraFee');
    }
    if (cents(totalFees) !== cents(nativeTotalFee)) {
      mismatches.push('totalFees');
    }
    const acceptedTotal =
      getEffectiveFeeMode(acceptedQuote) === 'fee-on-top'
        ? principal + totalFees
        : principal;
    const nativeTotal =
      getEffectiveFeeMode(acceptedQuote) === 'fee-on-top'
        ? nativePrincipal + nativeTotalFee
        : nativePrincipal;
    if (cents(acceptedTotal) !== cents(nativeTotal)) {
      mismatches.push('total');
    }
  }

  if (mismatches.length > 0) {
    throw new QuoteChangedError({ mismatches });
  }
}
