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
   * Currently wraps the synchronous PerpsController.toggleWatchlistMarket call.
   *
   * TODO(TAT-2663 — optimistic UI): Before the await, apply an optimistic local
   * state update (e.g. pass an onOptimisticUpdate callback from the caller).
   * On failure, roll back that state and show the addError toast below.
   *
   * TODO(TAT-2663 — User Storage API): Replace / augment the controller call
   * with a POST to the User Storage API once it is available.
   */
  addToWatchlist: (symbol: string) => Promise<void>;
  /**
   * Removes a market from the watchlist.
   *
   * Same optimistic UI and User Storage seams as addToWatchlist above.
   */
  removeFromWatchlist: (symbol: string) => Promise<void>;
}

/**
 * Provides add/remove watchlist actions with analytics, error reporting,
 * and structural seams for optimistic UI and the future User Storage API.
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

        // TODO(TAT-2663 — optimistic UI): Call onOptimisticUpdate?.() here
        // to instantly reflect the add in the UI before the async call resolves.

        controller.toggleWatchlistMarket(symbol);

        // TODO(TAT-2663 — User Storage API): await userStorageApi.addWatchlistMarket(symbol)

        const watchlistCount = controller.getWatchlistMarkets().length;
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol,
          [PERPS_EVENT_PROPERTY.SOURCE]: source,
          [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistCount,
        });
      } catch (error) {
        // TODO(TAT-2663 — optimistic UI): Roll back the optimistic state
        // update here (e.g. call onRollback?.()) before showing the error toast.

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
        // TODO(TAT-2663 — optimistic UI): Apply optimistic remove here.

        const controller = Engine.context.PerpsController;
        controller.toggleWatchlistMarket(symbol);

        // TODO(TAT-2663 — User Storage API): await userStorageApi.removeWatchlistMarket(symbol)

        const watchlistCount = controller.getWatchlistMarkets().length;
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol,
          [PERPS_EVENT_PROPERTY.SOURCE]: source,
          [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistCount,
        });
      } catch (error) {
        // TODO(TAT-2663 — optimistic UI): Roll back the optimistic remove here.

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
