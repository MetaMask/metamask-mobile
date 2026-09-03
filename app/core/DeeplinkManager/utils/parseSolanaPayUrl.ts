import { isAddress as isSolanaAddress } from '@solana/addresses';

import { PROTOCOLS } from '../../../constants/deeplinks';

const SOLANA_PAY_PREFIX = `${PROTOCOLS.SOLANA}:`;

export interface SolanaPayTransferRequest {
  type: 'transfer';
  recipient: string;
  amount?: string;
  splToken?: string;
  label?: string;
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
  const amount = searchParams.get('amount') ?? undefined;
  const splToken = searchParams.get('spl-token') ?? undefined;
  const label = searchParams.get('label') ?? undefined;
  const reference = searchParams.get('reference') ?? undefined;

  if (splToken && !isSolanaAddress(splToken)) {
    return null;
  }

  return {
    type: 'transfer',
    recipient: path,
    amount: amount || undefined,
    splToken: splToken || undefined,
    label: label || undefined,
    reference: reference || undefined,
  };
}
