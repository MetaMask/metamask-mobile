import { MESSAGE_TYPE } from '../../../core/createTracingMiddleware';
import { MetaMetricsRequestedThrough } from '../../../core/Analytics/MetaMetrics.types';

/**
 * Returns analytics data based on whether the request is multichain or not.
 *
 * @param isMultichainRequest - Boolean indicating if this is a multichain request
 * @returns Object containing api_source and method for analytics tracking
 * @property {MetaMetricsRequestedThrough} api_source - The API source (MultichainApi or EthereumProvider)
 * @property {MESSAGE_TYPE} method - The method type (ETH_REQUEST_ACCOUNTS or WALLET_CREATE_SESSION)
 */
export function getApiAnalyticsProperties(isMultichainRequest: boolean) {
  const api = isMultichainRequest
    ? MetaMetricsRequestedThrough.MultichainApi
    : MetaMetricsRequestedThrough.EthereumProvider;

  const method = isMultichainRequest
    ? MESSAGE_TYPE.WALLET_CREATE_SESSION
    : MESSAGE_TYPE.ETH_REQUEST_ACCOUNTS;

  return {
    api_source: api,
    method,
  };
}
