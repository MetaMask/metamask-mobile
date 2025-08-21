import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { selectExtendedAccountState } from '../controllers/selectors';
import type {
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
} from '../controllers/types';
import { usePerpsSelector } from './usePerpsSelector';

/**
 * Hook for accessing historical portfolio data with refresh capability
 * Provides cached data from Redux state and method to refresh from API
 */
export function usePerpsHistoricalPortfolio() {
  const extendedAccountState = usePerpsSelector(selectExtendedAccountState);
  const accountValue1dAgo = extendedAccountState?.accountValue1dAgo;

  // Refresh method that fetches new data and updates Redux state from PerpsController
  const refreshHistoricalPortfolio = useCallback(
    async (
      params?: GetHistoricalPortfolioParams,
    ): Promise<HistoricalPortfolioResult> => {
      const controller = Engine.context.PerpsController;
      return controller.getHistoricalPortfolio(params);
    },
    [],
  );

  return {
    accountValue1dAgo,
    extendedAccountState,
    refreshHistoricalPortfolio,
  };
}
