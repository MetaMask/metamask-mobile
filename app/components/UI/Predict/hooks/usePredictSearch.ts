import { useState, useCallback, useEffect, useRef } from 'react';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { PredictNavigationParamList } from '../types/navigation';

export interface UsePredictSearchResult {
  isSearchVisible: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: () => void;
  hideSearch: () => void;
  clearSearchAndClose: () => void;
}

export const usePredictSearch = (): UsePredictSearchResult => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();

  const requestedQuery = route.params?.query;
  const requestedOpen = route.params?.openSearch;
  const searchNonce = route.params?.searchNonce;
  const lastProcessedQueryRef = useRef<string | undefined>(requestedQuery);

  const [isSearchVisible, setIsSearchVisible] = useState(
    Boolean(requestedQuery) || requestedOpen === true,
  );
  const [searchQuery, setSearchQuery] = useState(requestedQuery ?? '');

  const onQueryChange = useCallback(() => {
    const isNewDeeplinkNavigation =
      requestedQuery !== lastProcessedQueryRef.current;

    if (!isNewDeeplinkNavigation) {
      return;
    }

    lastProcessedQueryRef.current = requestedQuery;

    if (requestedQuery) {
      setIsSearchVisible(true);
      setSearchQuery(requestedQuery);
    } else {
      setSearchQuery('');
      setIsSearchVisible(false);
    }
  }, [requestedQuery]);

  useFocusEffect(onQueryChange);

  useEffect(() => {
    if (requestedOpen === false) {
      setSearchQuery('');
      setIsSearchVisible(false);
      return;
    }
    if (requestedOpen === true || typeof searchNonce === 'number') {
      setIsSearchVisible(true);
    }
  }, [requestedOpen, searchNonce]);

  const showSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  const hideSearch = useCallback(() => {
    setIsSearchVisible(false);
  }, []);

  const clearSearchAndClose = useCallback(() => {
    setSearchQuery('');
    setIsSearchVisible(false);
  }, []);

  return {
    isSearchVisible,
    searchQuery,
    setSearchQuery,
    showSearch,
    hideSearch,
    clearSearchAndClose,
  };
};
