import { createSelector } from 'reselect';
import {
  getDefaultAssetsControllerState,
  type AssetsControllerState,
} from '@metamask/assets-controller';
import { RootState } from '../../reducers';

const defaultState = getDefaultAssetsControllerState();

const getAssetsController = (state: RootState): AssetsControllerState =>
  state.engine?.backgroundState?.AssetsController ?? defaultState;

export const getCustomAssets = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['customAssets'] =>
    assetsController?.customAssets ?? defaultState.customAssets,
);

export const getAssetsBalance = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetsBalance'] =>
    assetsController?.assetsBalance ?? defaultState.assetsBalance,
);

export const getAssetsInfo = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetsInfo'] =>
    assetsController?.assetsInfo ?? defaultState.assetsInfo,
);

export const getAssetsPrice = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetsPrice'] =>
    assetsController?.assetsPrice ?? defaultState.assetsPrice,
);

export const getAssetPreferences = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetPreferences'] =>
    assetsController?.assetPreferences ?? defaultState.assetPreferences,
);

export const getSelectedCurrency = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['selectedCurrency'] =>
    assetsController?.selectedCurrency ?? defaultState.selectedCurrency,
);

/**
 * Reconstructs the AssetsController state slice for balance aggregation.
 */
export const selectAssetsControllerStateForBalances = createSelector(
  [
    getAssetsInfo,
    getAssetsBalance,
    getAssetsPrice,
    getAssetPreferences,
    getCustomAssets,
    getSelectedCurrency,
  ],
  (
    assetsInfo,
    assetsBalance,
    assetsPrice,
    assetPreferences,
    customAssets,
    selectedCurrency,
  ): AssetsControllerState => ({
    assetsInfo,
    assetsBalance,
    assetsPrice,
    assetPreferences,
    customAssets,
    selectedCurrency,
  }),
);
