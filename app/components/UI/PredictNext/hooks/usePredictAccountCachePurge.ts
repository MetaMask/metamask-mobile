import { useEffect } from 'react';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { PORTFOLIO_QUERY_ACTION_NAMES } from '../queries/portfolioQueries';

/**
 * Drops this app's copies of the PredictNext account reads after
 * `PredictPortfolioService` reports that the Predict User changed.
 *
 * The service clears its own cache first, so a removal here can only discard
 * data the next read will refetch as the new Predict User. Only portfolio
 * reads are removed: the keys are `['PredictPortfolioService:<read>', ...]`,
 * and no other domain's queries or the public market-data caches are touched.
 */
export const usePredictAccountCachePurge = (): void => {
  useEffect(() => {
    const purgeAccountReads = () => {
      ReactQueryService.queryClient.removeQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === 'string' &&
          PORTFOLIO_QUERY_ACTION_NAMES.includes(query.queryKey[0]),
      });
    };

    Engine.controllerMessenger.subscribe(
      'PredictPortfolioService:accountDataCleared',
      purgeAccountReads,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'PredictPortfolioService:accountDataCleared',
        purgeAccountReads,
      );
    };
  }, []);
};
