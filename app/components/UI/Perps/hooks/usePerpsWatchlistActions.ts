import { useCallback } from 'react';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import usePerpsToasts from './usePerpsToasts';
import { flushEngineState } from '../utils/flushEngineState';
import { WATCHLIST_LIMIT } from '../utils/marketUtils';

interface UsePerpsWatchlistActionsResult {
  /**
   * Adds a market to the watchlist.
   *
   * Delegates to PerpsController.toggleWatchlistMarket, which performs an
   * optimistic local update and syncs to AuthenticatedUserStorageService.
   * Falls back to local-only when unauthenticated.
   */
  addToWatchlist: (symbol: string) => Promise<boolean>;
  /**
   * Removes a market from the watchlist.
   *
   * Same optimistic-update and AUS sync behaviour as addToWatchlist.
   */
  removeFromWatchlist: (symbol: string) => Promise<boolean>;
}

/**
 * Provides add/remove watchlist actions with analytics and error reporting.
 * The controller handles optimistic UI, AUS sync, and graceful degradation.
 *
 * @param source - Analytics source identifying where the action was triggered
 * (e.g. PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST).
 */
export const usePerpsWatchlistActions = (
  source: string = PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
): UsePerpsWatchlistActionsResult => {
  const { track } = usePerpsEventTracking();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const addToWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        const controller = Engine.context.PerpsController;
        const currentWatchlist = controller.getWatchlistMarkets();

        if (currentWatchlist.includes(symbol)) {
          return true;
        }

        if (currentWatchlist.length >= WATCHLIST_LIMIT) {
          showToast(PerpsToastOptions.watchlist.limitReached);
          return false;
        }

        // Not awaited: the controller applies its local update synchronously
        // and only then persists to AUS. It handles AUS failures by reverting
        // its optimistic update before resolving.
        const persisted = controller.toggleWatchlistMarket(symbol);

        flushEngineState();
        await persisted.finally(() => {
          flushEngineState();
        });
        const watchlistAfter = controller.getWatchlistMarkets();
        const wasAdded = watchlistAfter.includes(symbol);
        if (!wasAdded) {
          showToast(PerpsToastOptions.watchlist.addError);
          return false;
        }
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol,
          [PERPS_EVENT_PROPERTY.SOURCE]: source,
          [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistAfter.length,
        });
        showToast(PerpsToastOptions.watchlist.added(symbol));
        return true;
      } catch (error) {
        Logger.error(ensureError(error, 'usePerpsWatchlistActions.add'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsWatchlistActions',
            action: 'add_to_watchlist',
          },
          context: {
            name: 'usePerpsWatchlistActions',
            data: { symbol, source },
          },
        });

        showToast(PerpsToastOptions.watchlist.addError);
        return false;
      }
    },
    [source, track, showToast, PerpsToastOptions],
  );

  const removeFromWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        const controller = Engine.context.PerpsController;
        if (!controller.getWatchlistMarkets().includes(symbol)) {
          return true;
        }

        // Not awaited: see addToWatchlist.
        const persisted = controller.toggleWatchlistMarket(symbol);

        flushEngineState();
        await persisted.finally(() => {
          flushEngineState();
        });
        const watchlistAfter = controller.getWatchlistMarkets();
        const wasRemoved = !watchlistAfter.includes(symbol);
        if (!wasRemoved) {
          showToast(PerpsToastOptions.watchlist.removeError);
          return false;
        }
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol,
          [PERPS_EVENT_PROPERTY.SOURCE]: source,
          [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistAfter.length,
        });
        showToast(PerpsToastOptions.watchlist.removed(symbol));
        return true;
      } catch (error) {
        Logger.error(ensureError(error, 'usePerpsWatchlistActions.remove'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsWatchlistActions',
            action: 'remove_from_watchlist',
          },
          context: {
            name: 'usePerpsWatchlistActions',
            data: { symbol, source },
          },
        });

        showToast(PerpsToastOptions.watchlist.removeError);
        return false;
      }
    },
    [source, track, showToast, PerpsToastOptions],
  );

  return { addToWatchlist, removeFromWatchlist };
};
