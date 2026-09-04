import { isAddress as isSolanaAddress } from '@solana/addresses';

import { PROTOCOLS } from '../../../constants/deeplinks';
import { trimTrailingZeros } from '../../../components/UI/Bridge/utils/trimTrailingZeros';

const SOLANA_PAY_PREFIX = `${PROTOCOLS.SOLANA}:`;

/**
 * Solana Pay amount: non-negative integer or decimal in user units.
 * No scientific notation; values < 1 must include a leading `0` before `.`.
 * @see https://docs.solanapay.com/spec
 */
const SOLANA_PAY_AMOUNT_REGEX = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export interface SolanaPayTransferRequest {
  type: 'transfer';
  recipient: string;
  amount?: string;
  splToken?: string;
  reference?: string;
}

export interface SolanaPayTransactionRequest {
  type: 'transaction-request';
  link: string;
}

export type SolanaPayParseResult =
  | SolanaPayTransferRequest
  | SolanaPayTransactionRequest;

const isHttpUrl = (value: string) =>
  value.startsWith(`${PROTOCOLS.HTTP}:`) ||
  value.startsWith(`${PROTOCOLS.HTTPS}:`);

/**
 * Validates and normalizes a Solana Pay `amount` query value.
 * Returns null when the amount is malformed.
 */
export function normalizeSolanaPayAmount(amount: string): string | null {
  if (!SOLANA_PAY_AMOUNT_REGEX.test(amount)) {
    return null;
  }

  return trimTrailingZeros(amount);
}

/**
 * True when the amount's fractional digit count exceeds the asset's decimals
 * (after trailing zeros are stripped, matching Solana Pay reference behavior).
 */
export function hasExcessiveSolanaPayDecimals(
  amount: string,
  decimals: number,
): boolean {
  const normalized = trimTrailingZeros(amount);
  const decimalIndex = normalized.indexOf('.');
  if (decimalIndex === -1) {
    return false;
  }

  return normalized.length - decimalIndex - 1 > decimals;
}

/**
 * Parses a Solana Pay URI (`solana:<recipient>?amount=&spl-token=` or
 * `solana:<https-url>` transaction request). See https://docs.solanapay.com/spec
 */
export function parseSolanaPayUrl(url: string): SolanaPayParseResult | null {
  if (!url.toLowerCase().startsWith(SOLANA_PAY_PREFIX)) {
    return null;
  }

  const withoutScheme = url.slice(SOLANA_PAY_PREFIX.length);
  const querySeparatorIndex = withoutScheme.indexOf('?');
  const rawPath =
    querySeparatorIndex === -1
      ? withoutScheme
      : withoutScheme.slice(0, querySeparatorIndex);
  const queryString =
    querySeparatorIndex === -1
      ? ''
      : withoutScheme.slice(querySeparatorIndex + 1);
  const path = rawPath.replace(/^\/\//, '').replace(/^\//, '');

  if (isHttpUrl(path)) {
    const link =
      querySeparatorIndex === -1
        ? path
        : `${path}?${withoutScheme.slice(querySeparatorIndex + 1)}`;
    return {
      type: 'transaction-request',
      link,
    };
  }

  if (!isSolanaAddress(path)) {
    return null;
  }

  const searchParams = new URLSearchParams(queryString);
  const rawAmount = searchParams.get('amount');
  const splToken = searchParams.get('spl-token') ?? undefined;
  // Solana Pay allows repeated `reference` params; any presence must be
  // surfaced so the handler can reject unsupported reference-bearing URIs.
  const references = searchParams.getAll('reference').filter(Boolean);
  const reference = references[0];

  if (splToken && !isSolanaAddress(splToken)) {
    return null;
  }

  let amount: string | undefined;
  if (rawAmount !== null && rawAmount !== '') {
    const normalized = normalizeSolanaPayAmount(rawAmount);
    if (normalized === null) {
      return null;
    }
    amount = normalized;
  }

  return {
    type: 'transfer',
    recipient: path,
    amount,
    splToken: splToken || undefined,
    reference: reference || undefined,
  };
}
