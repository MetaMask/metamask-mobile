import type {
  MetaMetricsSwapsEventSource,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface BridgeSubmissionParams {
  quoteResponse: QuoteResponse & QuoteMetadata;
  location?: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

let cachedParams: BridgeSubmissionParams | null = null;

export function setBridgeSubmissionCache(params: BridgeSubmissionParams) {
  cachedParams = params;
}

export function getBridgeSubmissionCache(): BridgeSubmissionParams | null {
  return cachedParams;
}

export function clearBridgeSubmissionCache() {
  cachedParams = null;
}
