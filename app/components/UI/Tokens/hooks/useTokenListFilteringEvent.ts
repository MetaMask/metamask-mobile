import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';

export type TokenListFilteringInteractionType =
  | 'searched'
  | 'network_switched'
  | 'sorted';

interface SortConfig {
  key: string;
  order: string;
}

interface TrackOptions {
  searchQuery?: string;
  /**
   * Sort to report. Pass it when the sort has just changed, because the stored
   * preference still holds the old value at that moment.
   */
  sort?: SortConfig;
  /**
   * Network to report; `undefined` means all networks. Pass the key (even as
   * `undefined`) when the network has just changed, because the enabled
   * networks still hold the old value at that moment.
   */
  networkFilter?: string;
  /** Interaction specific properties, for example `result_count`. */
  extra?: Record<string, number>;
}

/**
 * Fires `Token List Filtering Interacted`. The search query, network and sort
 * are always sent together, so every interaction can be read in context.
 */
export const useTokenListFilteringEvent = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const storedSort = useSelector(selectTokenSortConfig);
  const { enabledNetworks, getNetworkInfo } = useCurrentNetworkInfo();
  // The network the list is filtered to; undefined when more than one is enabled.
  const storedNetworkFilter =
    enabledNetworks.length === 1 ? getNetworkInfo(0)?.caipChainId : undefined;

  return useCallback(
    (
      interactionType: TokenListFilteringInteractionType,
      options: TrackOptions = {},
    ) => {
      const sort = options.sort ?? storedSort;
      const networkFilter =
        'networkFilter' in options
          ? options.networkFilter
          : storedNetworkFilter;
      const searchQuery = options.searchQuery?.trim().toLowerCase();

      const properties = {
        interaction_type: interactionType,
        search_query: searchQuery || undefined,
        network_filter: networkFilter,
        // Same values as the extension's sort event: 'title' is alphabetical.
        token_sort_preference:
          sort.key === 'tokenFiatAmount' ? 'tokenFiatAmount' : 'title',
        sort_direction: sort.order === 'asc' ? 'asc' : 'desc',
        ...options.extra,
      };
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_LIST_FILTERING_INTERACTED)
          .addProperties(properties)
          .build(),
      );
    },
    [trackEvent, createEventBuilder, storedSort, storedNetworkFilter],
  );
};
