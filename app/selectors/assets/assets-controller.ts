import { createSelector } from 'reselect';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { RootState } from '../../reducers';

const getAssetsController = (state: RootState): AssetsControllerState =>
  state.engine?.backgroundState?.AssetsController ??
  ({} as AssetsControllerState);

export const getCustomAssets = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['customAssets'] =>
    assetsController?.customAssets ?? {},
);

export const getAssetsBalance = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetsBalance'] =>
    assetsController?.assetsBalance ?? {},
);

export const getAssetsInfo = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetsInfo'] =>
    assetsController?.assetsInfo ?? {},
);

export const getAssetPreferences = createSelector(
  [getAssetsController],
  (assetsController): AssetsControllerState['assetPreferences'] =>
    assetsController?.assetPreferences ?? {},
);
