import { useCallback } from 'react';
import {
  useSearchFooterBrowserNavigation,
  type SearchFooterAction,
} from '../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import {
  getSearchQueryLength,
  trackExploreSearchEvent,
  type SearchFeedPill,
} from './analytics';

/**
 * Footer press handler for Explore Search: fires `result_clicked`, then opens
 * the url in the browser.
 */
export const useExploreSearchFooterPress = ({
  searchQuery,
  tabName,
  resultCount,
}: {
  searchQuery: string;
  tabName: SearchFeedPill;
  resultCount?: number;
}) => {
  const { onPress: navigateToBrowser } = useSearchFooterBrowserNavigation();

  return useCallback(
    (url: string, action: SearchFooterAction) => {
      trackExploreSearchEvent({
        interaction_type: 'result_clicked',
        search_query: searchQuery,
        section_name: 'search_footer',
        tab_name: tabName,
        item_clicked: action,
        result_count: resultCount,
        query_length: getSearchQueryLength(searchQuery),
      });
      navigateToBrowser(url);
    },
    [searchQuery, tabName, resultCount, navigateToBrowser],
  );
};
