import type { TransactionMetricsBuilderRequest } from '../types';
import {
  getNetworkRpcUrl,
  extractRpcDomain,
} from '../../../../../util/rpc-domain-utils';
import { isFinalizedEvent } from '../utils';
import { EMPTY_METRICS } from '../constants';

export function getRPCMetricsProperties({
  eventType,
  transactionMeta,
}: TransactionMetricsBuilderRequest) {
  if (!isFinalizedEvent(eventType)) {
    return EMPTY_METRICS;
  }

  const rpcUrl = getNetworkRpcUrl(transactionMeta.chainId);
  const rpcDomain = extractRpcDomain(rpcUrl);

  return {
    properties: rpcDomain ? { rpc_domain: rpcDomain } : {},
    sensitiveProperties: {},
  };
}
