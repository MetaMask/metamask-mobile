import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  BridgeControllerState,
  selectMinimumBalanceForRentExemptionInSOL,
} from '@metamask/bridge-controller';
import { selectRemoteFeatureFlags } from '../featureFlagController';
import { analytics } from '../../util/analytics/analytics';
import {
  getCurrencyRateControllerCurrencyRates,
  getCurrencyRateControllerCurrentCurrency,
  getMultichainAssetsRatesControllerConversionRates,
  getTokenRatesControllerMarketData,
} from '../assets/assets-migration';

export const selectBridgeControllerState = (state: RootState) =>
  state.engine.backgroundState.BridgeController;

export const selectQuoteRequest = createSelector(
  selectBridgeControllerState,
  (bridgeControllerState: BridgeControllerState) =>
    bridgeControllerState.quoteRequest,
);

// Create the BridgeAppState selector following the same pattern as in bridge slice
export const selectBridgeAppState = (state: RootState) => ({
  ...state.engine.backgroundState.BridgeController,
  gasFeeEstimatesByChainId:
    state.engine.backgroundState.GasFeeController.gasFeeEstimatesByChainId ??
    {},
  ...{
    conversionRates: getMultichainAssetsRatesControllerConversionRates(state),
    historicalPrices: {},
  },
  ...{
    marketData: getTokenRatesControllerMarketData(state),
  },
  ...{
    currencyRates: getCurrencyRateControllerCurrencyRates(state),
    currentCurrency: getCurrencyRateControllerCurrentCurrency(state),
  },
  participateInMetaMetrics: analytics.isEnabled(),
  remoteFeatureFlags: {
    bridgeConfig: selectRemoteFeatureFlags(state).bridgeConfig,
  },
});

// Use the official bridge controller selector
export const selectMinSolBalance = createSelector(
  selectBridgeAppState,
  (bridgeAppState) => selectMinimumBalanceForRentExemptionInSOL(bridgeAppState),
);
