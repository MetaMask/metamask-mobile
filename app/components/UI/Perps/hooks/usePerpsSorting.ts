import { useState, useCallback, useMemo } from 'react';
import type { PerpsMarketData } from '../controllers/types';
import {
  sortMarkets,
  type SortField,
  type SortDirection,
} from '../utils/sortMarkets';
import {
  MARKET_SORTING_CONFIG,
  type SortOptionId,
} from '../constants/perpsConfig';

interface UsePerpsSortingParams {
  initialOptionId?: SortOptionId;
  initialDirection?: SortDirection;
}

interface UsePerpsSortingReturn {
  selectedOptionId: SortOptionId;
  sortBy: SortField;
  direction: SortDirection;
  handleOptionChange: (
    optionId: SortOptionId,
    field: SortField,
    direction: SortDirection,
  ) => void;
  sortMarketsList: (markets: PerpsMarketData[]) => PerpsMarketData[];
}

/**
 * Hook for managing market sorting state
 * Maintains sort field and direction as separate state
 * Direction can be toggled independently (used for price change option in UI)
 */
export const usePerpsSorting = ({
  initialOptionId = MARKET_SORTING_CONFIG.DEFAULT_SORT_OPTION_ID,
  initialDirection = MARKET_SORTING_CONFIG.DEFAULT_DIRECTION,
}: UsePerpsSortingParams = {}): UsePerpsSortingReturn => {
  const [selectedOptionId, setSelectedOptionId] =
    useState<SortOptionId>(initialOptionId);

  // Maintain direction as separate state to allow toggling
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  // Derive sortBy from selectedOptionId
  const sortBy = useMemo(() => {
    const option = MARKET_SORTING_CONFIG.SORT_OPTIONS.find(
      (opt) => opt.id === selectedOptionId,
    );
    return option?.field ?? MARKET_SORTING_CONFIG.SORT_FIELDS.VOLUME;
  }, [selectedOptionId]);

  const handleOptionChange = useCallback(
    (
      optionId: SortOptionId,
      _field: SortField,
      newDirection: SortDirection,
    ) => {
      setSelectedOptionId(optionId);
      setDirection(newDirection);
    },
    [],
  );

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
    selectedOptionId,
    sortBy,
    direction,
    handleOptionChange,
    sortMarketsList,
  };
};
