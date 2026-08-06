import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  PerpsMode,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsMode } from './usePerpsMode';
import { usePerpsNavigation } from './usePerpsNavigation';
import { usePerpsWatchlistActions } from './usePerpsWatchlistActions';
import { createSelectIsWatchlistMarket } from '../selectors/perpsController';
import { useDropPerpsHomeFromStackHistory } from '../utils/perpsModeSwitch';

export interface UsePerpsMarketHeaderActionsParams {
  /** Market symbol from route params; undefined when the screen is in an error state. */
  symbol?: string;
}

export interface UsePerpsMarketHeaderActionsResult {
  /** Current Lite/Pro mode for the active-mode pill. */
  perpsMode: PerpsMode;
  /** Whether the current market is on the watchlist. */
  isWatchlist: boolean;
  handleBackPress: () => void;
  handleMarketListPress: () => void;
  handleFavoritePress: () => void;
  handlePerpsModeChange: (nextMode: PerpsMode) => void;
}

/**
 * Header action handlers for Perps market detail screens (Lite and Pro).
 *
 * Keeps back / market-list / watchlist / mode-switch wiring out of market
 * views so screens stay layout-focused and the handlers can be unit-tested in
 * isolation. The wallet icon's balance-sheet visibility is owned by
 * `PerpsProMarketView` directly since it's local UI state, not a navigation
 * side effect.
 */
export const usePerpsMarketHeaderActions = ({
  symbol,
}: UsePerpsMarketHeaderActionsParams): UsePerpsMarketHeaderActionsResult => {
  const {
    navigateBack,
    navigateToWallet,
    navigateToMarketListFromHeader,
    canGoBack,
  } = usePerpsNavigation();
  const { mode: perpsMode, setMode: setPerpsMode } = usePerpsMode();
  const dropPerpsHomeFromStackHistory = useDropPerpsHomeFromStackHistory();
  const { track } = usePerpsEventTracking();
  const { addToWatchlist, removeFromWatchlist } = usePerpsWatchlistActions(
    PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
  );

  const selectIsWatchlist = useMemo(
    () => createSelectIsWatchlistMarket(symbol || ''),
    [symbol],
  );
  const isWatchlist = useSelector(selectIsWatchlist);

  const handleBackPress = useCallback(() => {
    if (canGoBack) {
      navigateBack();
    } else {
      // No back stack (e.g. this is the Pro-mode stack root): "home" while
      // Pro mode is active is itself a market screen, so falling back to it
      // here would often be a no-op. Leave Perps entirely instead.
      navigateToWallet();
    }
  }, [canGoBack, navigateBack, navigateToWallet]);

  const handleMarketListPress = useCallback(() => {
    if (!symbol) {
      return;
    }

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.MARKET_LIST,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS,
      [PERPS_EVENT_PROPERTY.ASSET]: symbol,
    });

    navigateToMarketListFromHeader({
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    });
  }, [symbol, track, navigateToMarketListFromHeader]);

  const handleFavoritePress = useCallback(() => {
    if (!symbol) {
      return;
    }

    // Fire-and-forget: watchlist actions apply an optimistic Redux update and
    // swallow their own errors (toast on failure). Do not await here.
    if (isWatchlist) {
      // eslint-disable-next-line no-void
      void removeFromWatchlist(symbol);
      return;
    }

    // eslint-disable-next-line no-void
    void addToWatchlist(symbol);
  }, [symbol, isWatchlist, addToWatchlist, removeFromWatchlist]);

  const handlePerpsModeChange = useCallback(
    (nextMode: PerpsMode) => {
      // The market-header pill owns the shimmer delay. Once it completes,
      // switch directly without opening the mode chooser.
      setPerpsMode(nextMode);
      // Drop Home so back cannot reveal the Lite hub while Pro is active
      // (TAT-3612).
      if (nextMode === PerpsMode.Pro) {
        dropPerpsHomeFromStackHistory();
      }
    },
    [setPerpsMode, dropPerpsHomeFromStackHistory],
  );

  return {
    perpsMode,
    isWatchlist,
    handleBackPress,
    handleMarketListPress,
    handleFavoritePress,
    handlePerpsModeChange,
  };
};

export default usePerpsMarketHeaderActions;
