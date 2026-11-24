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

interface UsePerpsWatchlistActionsOptions {
  showToasts?: boolean;
}

const findWatchedSymbol = (
  symbols: string[],
  symbol: string,
): string | undefined => {
  const normalizedSymbol = symbol.toLowerCase();
  return symbols.find(
    (watchedSymbol) => watchedSymbol.toLowerCase() === normalizedSymbol,
  );
};

const includesSymbol = (symbols: string[], symbol: string): boolean =>
  findWatchedSymbol(symbols, symbol) !== undefined;

/**
 * Provides add/remove watchlist actions with analytics and error reporting.
 * The controller handles optimistic UI, AUS sync, and graceful degradation.
 *
 * @param source - Analytics source identifying where the action was triggered
 * (e.g. PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST).
 */
export const usePerpsWatchlistActions = (
  source: string = PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
  { showToasts = true }: UsePerpsWatchlistActionsOptions = {},
): UsePerpsWatchlistActionsResult => {
  const { track } = usePerpsEventTracking();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const addToWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        const controller = Engine.context.PerpsController;
        const watchlistBefore = controller.getWatchlistMarkets();

        if (includesSymbol(watchlistBefore, symbol)) {
          return true;
        }

        if (watchlistBefore.length >= WATCHLIST_LIMIT) {
          if (showToasts) {
            showToast(PerpsToastOptions.watchlist.limitReached);
          }
          return false;
        }

        // Not awaited: the controller applies its local update synchronously
        // and only then persists to AUS. Awaiting the network write delayed the
        // toast and its haptic by the round-trip. The controller handles AUS
        // failures by reverting its optimistic update before resolving.
        const persisted = controller.toggleWatchlistMarket(symbol);

        const watchlistAfter = controller.getWatchlistMarkets();
        if (includesSymbol(watchlistAfter, symbol)) {
          if (showToasts) {
            showToast(PerpsToastOptions.watchlist.added(symbol));
          }
        }

        flushEngineState();
        await persisted.finally(() => {
          flushEngineState();
        });
        const finalWatchlist = controller.getWatchlistMarkets();
        const didAdd = includesSymbol(finalWatchlist, symbol);
        if (didAdd) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
            [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
              PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
            [PERPS_EVENT_PROPERTY.ASSET]: symbol,
            [PERPS_EVENT_PROPERTY.SOURCE]: source,
            [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: finalWatchlist.length,
          });
        }
        return didAdd;
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

        if (showToasts) {
          showToast(PerpsToastOptions.watchlist.addError);
        }
        return false;
      }
    },
    [source, track, showToast, showToasts, PerpsToastOptions],
  );

  const removeFromWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        const controller = Engine.context.PerpsController;
        const watchlistBefore = controller.getWatchlistMarkets();
        const storedSymbol = findWatchedSymbol(watchlistBefore, symbol);
        if (!storedSymbol) {
          return true;
        }
        // Not awaited before the toast — see addToWatchlist.
        const persisted = controller.toggleWatchlistMarket(storedSymbol);

        const watchlistAfter = controller.getWatchlistMarkets();
        if (!includesSymbol(watchlistAfter, symbol)) {
          if (showToasts) {
            showToast(PerpsToastOptions.watchlist.removed(symbol));
          }
        }

        flushEngineState();
        await persisted.finally(() => {
          flushEngineState();
        });
        const finalWatchlist = controller.getWatchlistMarkets();
        const didRemove = !includesSymbol(finalWatchlist, symbol);
        if (didRemove) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
            [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
              PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
            [PERPS_EVENT_PROPERTY.ASSET]: symbol,
            [PERPS_EVENT_PROPERTY.SOURCE]: source,
            [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: finalWatchlist.length,
          });
        }
        return didRemove;
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

        if (showToasts) {
          showToast(PerpsToastOptions.watchlist.removeError);
        }
        return false;
      }
    },
    [source, track, showToast, showToasts, PerpsToastOptions],
  );

  return { addToWatchlist, removeFromWatchlist };
};
