import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  BridgeControllerState,
  selectMinimumBalanceForRentExemptionInSOL,
} from '@metamask/bridge-controller';
import { selectRemoteFeatureFlags } from '../featureFlagController';
import { selectGasFeeControllerEstimates } from '../gasFeeController';
import { MetaMetrics } from '../../core/Analytics';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';

export const selectBridgeControllerState = (state: RootState) =>
  state.engine.backgroundState.BridgeController;

export const selectQuoteRequest = createSelector(
  selectBridgeControllerState,
  (bridgeControllerState: BridgeControllerState) =>
    bridgeControllerState.quoteRequest,
);

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsRatesController: conversionRates, historicalPrices
// TokenRatesController: marketData
// CurrencyRateController: currencyRates, currentCurrency
// References
// app/selectors/bridgeController/index.ts (1)
// Create the BridgeAppState selector following the same pattern as in bridge slice
export const selectBridgeAppState = (state: RootState) => ({
  ...state.engine.backgroundState.BridgeController,
  gasFeeEstimates: selectGasFeeControllerEstimates(state) as GasFeeEstimates,
  ...state.engine.backgroundState.MultichainAssetsRatesController,
  ...state.engine.backgroundState.TokenRatesController,
  ...state.engine.backgroundState.CurrencyRateController,
  participateInMetaMetrics: MetaMetrics.getInstance().isEnabled(),
  remoteFeatureFlags: {
    bridgeConfig: selectRemoteFeatureFlags(state).bridgeConfig,
  },
});

// Use the official bridge controller selector
export const selectMinSolBalance = createSelector(
  selectBridgeAppState,
  (bridgeAppState) => selectMinimumBalanceForRentExemptionInSOL(bridgeAppState),
);
