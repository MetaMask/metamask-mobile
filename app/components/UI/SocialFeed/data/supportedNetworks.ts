import { useQuery } from '@metamask/react-data-query';
import type { SupportedNetworksResponse } from '@metamask/social-controllers';
import type { CaipChainId } from '@metamask/utils';
import { FEED_CAIP2_CHAINS } from './feed-constants';

/** Query key of `SocialService:fetchSupportedNetworks` (the action name). */
export const SUPPORTED_NETWORKS_QUERY_KEY = [
  'SocialService:fetchSupportedNetworks',
] as const;

/**
 * The chains social-api serves: the networks it reports as fully supported, or
 * {@link FEED_CAIP2_CHAINS} while that list is not loaded, failed to load, or
 * came back empty. The fallback keeps callers from ever seeing an empty list.
 *
 * @param supportedNetworks - The cached `fetchSupportedNetworks` response.
 * @returns CAIP-2 chain ids, in the order social-api lists them.
 */
export const resolveFeedChains = (
  supportedNetworks?: SupportedNetworksResponse,
): readonly CaipChainId[] =>
  supportedNetworks && supportedNetworks.fullSupport.length > 0
    ? supportedNetworks.fullSupport
    : FEED_CAIP2_CHAINS;

/**
 * Loads the supported networks once per app session; the list changes rarely,
 * so remounts, app focus and reconnects reuse the cached copy.
 *
 * @param enabled - Whether to fetch. The request needs the user's token.
 * @returns The chains social-api serves, from {@link resolveFeedChains}.
 */
export const useFeedChains = (enabled = true): readonly CaipChainId[] => {
  const { data } = useQuery<SupportedNetworksResponse>({
    queryKey: SUPPORTED_NETWORKS_QUERY_KEY,
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return resolveFeedChains(data);
};
