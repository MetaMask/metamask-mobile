import { useState, useCallback, useMemo } from 'react';
import {
  filterMarketsByQuery,
  type PerpsMarketData,
} from '@metamask/perps-controller';

interface UsePerpsSearchParams {
  /**
   * Markets to filter
   */
  markets: PerpsMarketData[];
}

interface UsePerpsSearchReturn {
  /**
   * Current search query
   */
  searchQuery: string;
  /**
   * Update search query
   */
  setSearchQuery: (query: string) => void;
  /**
   * Markets filtered by search query
   */
  filteredMarkets: PerpsMarketData[];
  /**
   * Clear search query
   */
  clearSearch: () => void;
}

/**
 * Hook for managing market search state and filtering
 *
 * Responsibilities:
 * - Manages search query state
 * - Filters markets by symbol/name
 * - Type-safe field access
 *
 * @example
 * ```tsx
 * const { markets } = usePerpsMarkets();
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   filteredMarkets,
 *   clearSearch,
 * } = usePerpsSearch({ markets });
 * ```
 */
export const usePerpsSearch = ({
  markets,
}: UsePerpsSearchParams): UsePerpsSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return markets;
    }
    return filterMarketsByQuery(markets, searchQuery);
  }, [markets, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    clearSearch,
  };
};
