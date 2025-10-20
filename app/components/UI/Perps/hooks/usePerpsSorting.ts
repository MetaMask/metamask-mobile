import { useState, useCallback } from 'react';
import type { PerpsMarketData } from '../controllers/types';
import {
  sortMarkets,
  type SortField,
  type SortDirection,
} from '../utils/sortMarkets';
import { MARKET_SORTING_CONFIG } from '../constants/perpsConfig';

interface UsePerpsSortingParams {
  initialSortBy?: SortField;
  initialDirection?: SortDirection;
}

interface UsePerpsSortingReturn {
  sortBy: SortField;
  direction: SortDirection;
  handleSortChange: (field: SortField) => void;
  handleDirectionToggle: () => void;
  sortMarketsList: (markets: PerpsMarketData[]) => PerpsMarketData[];
}

/**
 * Hook for managing market sorting state and operations
 * Uses object parameters pattern for maintainability
 */
export const usePerpsSorting = ({
  initialSortBy = MARKET_SORTING_CONFIG.DEFAULT_SORT_FIELD,
  initialDirection = MARKET_SORTING_CONFIG.DEFAULT_DIRECTION,
}: UsePerpsSortingParams = {}): UsePerpsSortingReturn => {
  const [sortBy, setSortBy] = useState<SortField>(initialSortBy);
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  const handleSortChange = useCallback((field: SortField) => {
    setSortBy(field);
  }, []);

  const handleDirectionToggle = useCallback(() => {
    setDirection((prev) =>
      prev === MARKET_SORTING_CONFIG.DEFAULT_DIRECTION ? 'asc' : 'desc',
    );
  }, []);

  const sortMarketsList = useCallback(
    (markets: PerpsMarketData[]) =>
      sortMarkets({
        markets,
        sortBy,
        direction,
      }),
    [sortBy, direction],
  );

  return {
    sortBy,
    direction,
    handleSortChange,
    handleDirectionToggle,
    sortMarketsList,
  };
};
