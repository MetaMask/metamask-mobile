import { escapeRegExp } from 'lodash';
import { PopularList } from '../../../../util/networks/customNetworks';
import { getIsQuicknodeEndpointUrl } from '../../../../util/networks/network-failover';
import { BUILT_IN_CUSTOM_NETWORKS_RPC } from '@metamask/controller-utils';
import { isPublicRpcDomain } from '../../../../util/rpc-domain-utils';

export { getIsQuicknodeEndpointUrl };

/**
 * Environments that are expected to resemble production, or production itself.
 */
export const PRODUCTION_LIKE_ENVIRONMENTS = [
  'production',
  'pre-release',
  'qa',
  'beta',
  'rc',
  'exp',
];

/**
 * The list of unofficial endpoints that we allow users to add easily.
 */
const FEATURED_RPC_ENDPOINTS = PopularList.map(({ nickname, rpcUrl }) => ({
  name: nickname,
  url: rpcUrl,
}));

/**
 * The list of unofficial endpoints that can be added as default networks.
 */
const BUILT_IN_CUSTOM_ENDPOINTS = Object.entries(
  BUILT_IN_CUSTOM_NETWORKS_RPC,
).map(([name, url]) => ({ name, url }));

/**
 * The list of known unofficial endpoints.
 */
export const KNOWN_CUSTOM_ENDPOINTS = [
  ...FEATURED_RPC_ENDPOINTS,
  ...BUILT_IN_CUSTOM_ENDPOINTS,
];

/**
 * The list of known unofficial endpoints.
 */
const KNOWN_CUSTOM_ENDPOINT_URLS = KNOWN_CUSTOM_ENDPOINTS.map(({ url }) => url);

/**
 * Determines whether the given RPC endpoint URL matches an Infura URL that uses
 * our API key.
 *
 * @param endpointUrl - The URL of the RPC endpoint.
 * @param infuraProjectId - Our Infura project ID.
 * @returns True if the URL is an Infura URL, false otherwise.
 */
export function getIsMetaMaskInfuraEndpointUrl(
  endpointUrl: string,
  infuraProjectId: string,
): boolean {
  return new RegExp(
    `^https://[^.]+\\.infura\\.io/v3/(?:\\{infuraProjectId\\}|${escapeRegExp(
      infuraProjectId,
    )})$`,
    'u',
  ).test(endpointUrl);
}

/**
 * The proportion of RPC service events (degraded/unavailable) that
 * `NetworkController` should emit, passed as the `rpcServiceEventsSampleRate`
 * analytics option.
 *
 * In production and for a release candidate we sample only 1% of events; in
 * development and testing we emit every event; when the environment is unknown
 * we emit none. The controller applies this rate deterministically per user, so
 * the same user is consistently in or out of the sample.
 *
 * @returns The sample rate, between 0 and 1.
 */
export function getRpcServiceEventsSampleRate(): number {
  if (process.env.METAMASK_ENVIRONMENT === undefined) {
    return 0;
  }

  if (PRODUCTION_LIKE_ENVIRONMENTS.includes(process.env.METAMASK_ENVIRONMENT)) {
    // Sample 1% of users in production-like environments.
    return 0.01;
  }

  return 1;
}

/**
 * Some URLs that users add as networks refer to private servers, and we do not
 * want to report these in Segment (or any other data collection service). This
 * function returns whether the given RPC endpoint is safe to share.
 *
 * @param endpointUrl - The URL of the endpoint.
 * @param infuraProjectId - Our Infura project ID.
 * @returns True if the endpoint URL is safe to share with external data
 * collection services, false otherwise.
 */
export function isPublicEndpointUrl(
  endpointUrl: string,
  infuraProjectId: string,
) {
  return (
    getIsMetaMaskInfuraEndpointUrl(endpointUrl, infuraProjectId) ||
    getIsQuicknodeEndpointUrl(endpointUrl) ||
    KNOWN_CUSTOM_ENDPOINT_URLS.includes(endpointUrl) ||
    isPublicRpcDomain(endpointUrl)
  );
}
