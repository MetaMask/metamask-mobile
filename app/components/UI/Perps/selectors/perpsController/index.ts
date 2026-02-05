import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import {
  selectIsFirstTimeUser,
  selectWatchlistMarkets,
  selectIsWatchlistMarket,
  selectMarketFilterPreferences,
} from '../../controllers/selectors';
import { InitializationState } from '../../controllers/PerpsController';
import type { PerpsActiveProviderMode } from '../../controllers/types';

const selectPerpsControllerState = (state: RootState) =>
  state.engine.backgroundState.PerpsController;

const selectPerpsProvider = createSelector(
  selectPerpsControllerState,
  (perpsControllerState): PerpsActiveProviderMode | undefined =>
    perpsControllerState?.activeProvider,
);

const selectPerpsAccountState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.accountState || null,
);

const selectPerpsDepositState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    if (!perpsControllerState) {
      return {
        inProgress: false,
        lastResult: null,
      };
    }

    return {
      inProgress: perpsControllerState.depositInProgress || false,
      lastResult: perpsControllerState.lastDepositResult || null,
    };
  },
);

const selectPerpsEligibility = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.isEligible || false,
);

const selectPerpsNetwork = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) =>
    perpsControllerState?.isTestnet ? 'testnet' : 'mainnet',
);

const selectPerpsBalances = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.perpsBalances || {},
);

const selectIsFirstTimePerpsUser = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => selectIsFirstTimeUser(perpsControllerState),
);

const selectPerpsWatchlistMarkets = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => selectWatchlistMarkets(perpsControllerState),
);

const selectPerpsMarketFilterPreferences = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => selectMarketFilterPreferences(perpsControllerState),
);

/**
 * True when the user selected the synthetic "Perps balance" option (selectedPaymentToken === null).
 */
const selectIsPerpsBalanceSelected = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.selectedPaymentToken == null,
);

/**
 * Selects the current initialization state of the Perps controller.
 * Used by UI components to determine if operations can be performed.
 *
 * @returns InitializationState enum value:
 * - 'uninitialized': Controller not yet started
 * - 'initializing': Currently attempting initialization (may be retrying)
 * - 'initialized': Ready for operations
 * - 'failed': All retry attempts exhausted, user action required
 */
const selectPerpsInitializationState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) =>
    perpsControllerState?.initializationState ||
    InitializationState.Uninitialized,
);

// Factory function to create selector for specific market
export const createSelectIsWatchlistMarket = (symbol: string) =>
  createSelector(selectPerpsControllerState, (perpsControllerState) =>
    selectIsWatchlistMarket(perpsControllerState, symbol),
  );

export {
  selectPerpsProvider,
  selectPerpsAccountState,
  selectPerpsDepositState,
  selectPerpsEligibility,
  selectPerpsNetwork,
  selectPerpsBalances,
  selectIsFirstTimePerpsUser,
  selectPerpsWatchlistMarkets,
  selectPerpsMarketFilterPreferences,
  selectPerpsInitializationState,
  selectIsPerpsBalanceSelected,
};
