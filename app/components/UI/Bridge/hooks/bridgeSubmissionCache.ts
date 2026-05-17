import type {
  MetaMetricsSwapsEventSource,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const QUOTE_STALE_THRESHOLD_MS = 2 * 60 * 1000;

export interface BridgeSubmissionParams {
  quoteResponse: QuoteResponse & QuoteMetadata;
  location?: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  fetchedAt: number;
}

let cachedParams: BridgeSubmissionParams | null = null;

export function setBridgeSubmissionCache(params: Omit<BridgeSubmissionParams, 'fetchedAt'>) {
  cachedParams = { ...params, fetchedAt: Date.now() };
}

export function getBridgeSubmissionCache(): BridgeSubmissionParams | null {
  return cachedParams;
}

export function isBridgeSubmissionCacheStale(): boolean {
  if (!cachedParams) return true;
  return Date.now() - cachedParams.fetchedAt > QUOTE_STALE_THRESHOLD_MS;
}

export function clearBridgeSubmissionCache() {
  cachedParams = null;
}
