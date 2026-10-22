import { useEffect } from 'react';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { PORTFOLIO_QUERY_ACTION_NAMES } from '../queries/portfolioQueries';

/** Whether a query is one of the PredictNext portfolio reads: its key is
 * `['PredictPortfolioService:<read>', ...]`, and nothing else. */
const isPortfolioRead = (query: {
  readonly queryKey: readonly unknown[];
}): boolean =>
  typeof query.queryKey[0] === 'string' &&
  PORTFOLIO_QUERY_ACTION_NAMES.includes(query.queryKey[0]);

/**
 * Clears this app's copies of the PredictNext account reads after
 * `PredictPortfolioService` reports that the Predict User changed.
 *
 * The service clears its own cache first, so a purge here can only discard
 * data the next read will refetch as the new Predict User. Only portfolio
 * reads are touched: the keys are `['PredictPortfolioService:<read>', ...]`,
 * and no other domain's queries or the public market-data caches are.
 */
export const usePredictAccountCachePurge = (): void => {
  // Read during render, and used as the effect's dependency, so a recreated
  // Engine (a vault restore from backup initializes a new one in-process, and
  // `App` is not remounted) is picked up instead of leaving the purge
  // subscribed to the destroyed messenger. `ControllerEventToastBridge` binds
  // to the current messenger the same way.
  const controllerMessenger = Engine.controllerMessenger;

  useEffect(() => {
    const purgeAccountReads = () => {
      const { queryClient } = ReactQueryService;

      // Reset rather than only remove. Removing drops the Query from the
      // cache, but a mounted observer keeps its own copy of the previous
      // Predict User's data until it rebuilds its state. Resetting clears
      // `data` for every matched query — notifying those mounted observers —
      // and refetches the active ones through their `queryFn`, which calls the
      // service action. The service stale-marked its entries before publishing
      // this event, so those refetches come back as the new Predict User.
      queryClient
        .resetQueries({ predicate: isPortfolioRead })
        // A refetch the new Predict User's session cannot serve yet is an
        // ordinary query failure that surfaces through the query state; it
        // must not become an unhandled rejection.
        .catch(() => undefined);

      // Then remove the matched queries nobody is observing, so their
      // already-reset copies do not linger in the cache.
      queryClient.removeQueries({
        predicate: (query) =>
          isPortfolioRead(query) && query.getObserversCount() === 0,
      });
    };

    controllerMessenger.subscribe(
      'PredictPortfolioService:accountDataCleared',
      purgeAccountReads,
    );

    return () => {
      controllerMessenger.unsubscribe(
        'PredictPortfolioService:accountDataCleared',
        purgeAccountReads,
      );
    };
  }, [controllerMessenger]);
};
