import { createSelector } from 'reselect';
import {
  getIsAssetsLoadingForSelectedAccountGroup,
  getDefaultAssetsControllerState,
  type AssetsControllerState,
} from '@metamask/assets-controller';
import type { Hex } from '@metamask/utils';
import { RootState } from '../../reducers';
import { buildEvmCaip19AssetId } from '../../util/multichain/buildEvmCaip19AssetId';
import { selectAccountTreeControllerState } from '../multichainAccounts/accountTreeController';

const defaultState = getDefaultAssetsControllerState();

const getAssetsController = (state: RootState): AssetsControllerState =>
  state.engine?.backgroundState?.AssetsController ?? defaultState;

export const selectIsAssetsLoadingForSelectedAccountGroup = createSelector(
  [getAssetsController, selectAccountTreeControllerState],
  getIsAssetsLoadingForSelectedAccountGroup,
);

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

export interface Erc20TokenMetadata {
  symbol?: string;
  decimals?: number;
}

/**
 * Resolves ERC-20 metadata (symbol, decimals) by chain and contract address.
 *
 * Reads `assetsInfo` directly rather than `selectAllTokens`: that selector is
 * derived from `assetsBalance`, so a token drops out of it as soon as its
 * balance does (e.g. after sending the full amount), while `assetsInfo` keeps
 * the metadata.
 */
export const selectErc20MetadataLookup = createSelector(
  [getAssetsInfo],
  (assetsInfo) => {
    const metadataByAssetId = new Map(
      Object.entries(assetsInfo).map(([assetId, metadata]) => [
        assetId.toLowerCase(),
        metadata,
      ]),
    );

    return (
      chainId: string,
      contractAddress: string,
    ): Erc20TokenMetadata | undefined => {
      const metadata = metadataByAssetId.get(
        buildEvmCaip19AssetId(contractAddress, chainId as Hex),
      );
      return metadata?.type === 'erc20'
        ? { symbol: metadata.symbol, decimals: metadata.decimals }
        : undefined;
    };
  },
);
