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
import { WATCHLIST_LIMIT } from '../utils/marketUtils';

interface UsePerpsWatchlistActionsResult {
  /**
   * Adds a market to the watchlist.
   *
   * Delegates to PerpsController.toggleWatchlistMarket, which performs an
   * optimistic local update and syncs to AuthenticatedUserStorageService.
   * Falls back to local-only when unauthenticated.
   */
  addToWatchlist: (symbol: string) => Promise<void>;
  /**
   * Removes a market from the watchlist.
   *
   * Same optimistic-update and AUS sync behaviour as addToWatchlist.
   */
  removeFromWatchlist: (symbol: string) => Promise<void>;
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
    async (symbol: string): Promise<void> => {
      try {
        const controller = Engine.context.PerpsController;

        if (controller.getWatchlistMarkets().length >= WATCHLIST_LIMIT) {
          showToast(PerpsToastOptions.watchlist.limitReached);
          return;
        }

        await controller.toggleWatchlistMarket(symbol);

        const watchlistAfter = controller.getWatchlistMarkets();
        if (watchlistAfter.includes(symbol)) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
            [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
              PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
            [PERPS_EVENT_PROPERTY.ASSET]: symbol,
            [PERPS_EVENT_PROPERTY.SOURCE]: source,
            [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistAfter.length,
          });
        }
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
      }
    },
    [source, track, showToast, PerpsToastOptions],
  );

  const removeFromWatchlist = useCallback(
    async (symbol: string): Promise<void> => {
      try {
        const controller = Engine.context.PerpsController;
        await controller.toggleWatchlistMarket(symbol);

        const watchlistAfter = controller.getWatchlistMarkets();
        if (!watchlistAfter.includes(symbol)) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
            [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
              PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
            [PERPS_EVENT_PROPERTY.ASSET]: symbol,
            [PERPS_EVENT_PROPERTY.SOURCE]: source,
            [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistAfter.length,
          });
        }
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
      }
    },
    [source, track],
  );

  return { addToWatchlist, removeFromWatchlist };
};
