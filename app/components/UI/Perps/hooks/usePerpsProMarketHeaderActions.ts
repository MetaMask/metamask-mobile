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
import { showPerpsModeFlash } from '../utils/perpsModeFlash';

export interface UsePerpsProMarketHeaderActionsParams {
  /** Market symbol from route params; undefined when the screen is in an error state. */
  symbol?: string;
}

export interface UsePerpsProMarketHeaderActionsResult {
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
 * Header action handlers for the Pro market detail screen.
 *
 * Keeps back / market-list / watchlist / mode-switch wiring out of
 * `PerpsProMarketView` so the screen stays layout-focused and the handlers can
 * be unit-tested in isolation. The wallet icon's balance-sheet visibility is
 * owned by `PerpsProMarketView` directly since it's local UI state, not a
 * navigation side effect.
 */
export const usePerpsProMarketHeaderActions = ({
  symbol,
}: UsePerpsProMarketHeaderActionsParams): UsePerpsProMarketHeaderActionsResult => {
  const { navigateBack, navigateToWallet, navigateToMarketList, canGoBack } =
    usePerpsNavigation();
  const { mode: perpsMode, setMode: setPerpsMode } = usePerpsMode();
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

    navigateToMarketList({
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      fromMarketDetails: true,
    });
  }, [symbol, track, navigateToMarketList]);

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
      setPerpsMode(nextMode);
      showPerpsModeFlash(nextMode);
    },
    [setPerpsMode],
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

export default usePerpsProMarketHeaderActions;
