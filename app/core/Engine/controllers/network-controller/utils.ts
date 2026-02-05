import { escapeRegExp } from 'lodash';
import { isConnectionError } from '@metamask/network-controller';
import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import {
  QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME,
  PopularList,
} from '../../../../util/networks/customNetworks';
import { BUILT_IN_CUSTOM_NETWORKS_RPC } from '@metamask/controller-utils';
import { isPublicRpcDomain } from '../../../../util/rpc-domain-utils';

/**
 * We capture Segment events for degraded or unavailable RPC endpoints for 1%
 * of our userbase.
 */
const SAMPLING_RATE = 0.01;

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
 * Determines whether the given RPC endpoint URL matches a known Quicknode URL.
 *
 * @param endpointUrl - The URL of the RPC endpoint.
 * @returns True if the URL is a Quicknode URL, false otherwise.
 */
export function getIsQuicknodeEndpointUrl(endpointUrl: string): boolean {
  return Object.values(QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME)
    .map((getUrl) => getUrl())
    .includes(endpointUrl);
}

/**
 * Events should only be created in Segment when an RPC endpoint is detected to
 * be degraded or unavailable if:
 *
 * - The RPC endpoint is slow
 * - The user does not have local connectivity issues
 * - The user is in the MetaMetrics sample
 *
 * @param args - The arguments.
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 * @returns True if Segment events should be created, false otherwise.
 */
export function shouldCreateRpcServiceEvents({
  error,
  metaMetricsId,
}: {
  error?: unknown;
  metaMetricsId: string | null | undefined;
}) {
  return (
    (!error || !isConnectionError(error)) &&
    metaMetricsId !== undefined &&
    metaMetricsId !== null &&
    isSamplingMetaMetricsUser(metaMetricsId)
  );
}

/**
 * Determines whether the user is included in the sample for MetaMetrics.
 *
 * In production and for a release candidate, we sample only 1% of the available
 * events; in development and testing we create every event.
 *
 * @param metaMetricsId - The MetaMetrics ID of the user.
 * @returns True if the user is included in the sample for MetaMetrics, false
 * otherwise.
 */
function isSamplingMetaMetricsUser(metaMetricsId: string) {
  if (process.env.METAMASK_ENVIRONMENT === undefined) {
    return false;
  }

  if (PRODUCTION_LIKE_ENVIRONMENTS.includes(process.env.METAMASK_ENVIRONMENT)) {
    return generateDeterministicRandomNumber(metaMetricsId) < SAMPLING_RATE;
  }

  return true;
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
