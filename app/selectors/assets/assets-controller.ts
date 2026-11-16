import { createSelector } from 'reselect';
import {
  getAccountGroupLoadingStatus,
  getIsAssetsBackgroundLoadingForSelectedAccountGroup,
  getIsAssetsLoadingForSelectedAccountGroup,
  getDefaultAssetsControllerState,
  type AssetsControllerState,
} from '@metamask/assets-controller';
import type { Hex } from '@metamask/utils';
import { RootState } from '../../reducers';
import { buildEvmCaip19AssetId } from '../../util/multichain/buildEvmCaip19AssetId';
import {
  buildAssetIdIndex,
  resolveEvmAssetId,
  type EvmAssetIdResolver,
} from '../../util/transactions/payment-token';
import { selectAccountTreeControllerState } from '../multichainAccounts/accountTreeController';

const defaultState = getDefaultAssetsControllerState();

const getAssetsController = (state: RootState): AssetsControllerState =>
  state.engine?.backgroundState?.AssetsController ?? defaultState;

export const selectIsAssetsLoadingForSelectedAccountGroup = createSelector(
  [getAssetsController, selectAccountTreeControllerState],
  getIsAssetsLoadingForSelectedAccountGroup,
);

/**
 * Whether the selected account group's complete asset load has settled.
 *
 * An absent initial status means the first load has not started yet — treating
 * that as loaded briefly exposes placeholder zero balances. The account tree
 * and background phase must also settle because SRP import discovers accounts
 * asynchronously and background fetch supplies remaining RPC/Snap assets.
 *
 * @param state - Redux root state.
 * @returns True once initial and background loads have settled.
 */
export const selectAssetsHaveLoadedForSelectedAccountGroup = createSelector(
  [getAssetsController, selectAccountTreeControllerState],
  (assetsController, accountTreeState): boolean => {
    const selectedGroupId = accountTreeState?.selectedAccountGroup;
    if (!selectedGroupId || accountTreeState.isAccountTreeSyncingInProgress) {
      return false;
    }

    const statuses = Object.values(
      getAccountGroupLoadingStatus(
        {
          assetsLoadingStatus: assetsController.assetsLoadingStatus,
        },
        accountTreeState,
        selectedGroupId,
      ),
    );

    // `#start()` can return early with no accounts/chains and never write a
    // status. Treat an empty group as settled so home does not stay on
    // skeletons for the whole session.
    if (statuses.length === 0) {
      const wallets = accountTreeState.accountTree?.wallets ?? {};
      const groupHasAccounts = Object.values(wallets).some((wallet) => {
        const group = wallet?.groups?.[selectedGroupId];
        return Boolean(group?.accounts?.length);
      });
      return !groupHasAccounts;
    }

    const initialLoadHasSettled = statuses.every(
      (status) => status === 'loaded',
    );
    const backgroundLoadIsRunning =
      getIsAssetsBackgroundLoadingForSelectedAccountGroup(
        {
          assetsBackgroundLoadingStatus:
            assetsController.assetsBackgroundLoadingStatus,
        },
        accountTreeState,
      );

    // Soft-gating in Tokens / balance UI shows real rows during background
    // work; the selector still waits on background so empty/placeholder
    // wallets do not flash zero-value funding prompts too early.
    return initialLoadHasSettled && !backgroundLoadIsRunning;
  },
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

/**
 * Resolves the CAIP-19 asset ID of an EVM token as keyed in `AssetsController`
 * state, for callers that select tokens by chain and address (configured,
 * persisted or required tokens). State is indexed once per `assetsInfo` change.
 */
export const selectEvmAssetIdResolver = createSelector(
  [getAssetsInfo],
  (assetsInfo): EvmAssetIdResolver => {
    const index = buildAssetIdIndex(assetsInfo);
    return (token) => resolveEvmAssetId(token, index);
  },
);
