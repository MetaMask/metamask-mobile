import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import {
  Hex,
  CaipChainId,
  parseCaipChainId,
  CaipAssetType,
} from '@metamask/utils';
import { createSelector } from 'reselect';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { uniqBy } from 'lodash';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  AllowedBridgeChainIds,
  formatChainIdToCaip,
  isSolanaChainId,
  selectBridgeQuotes as selectBridgeQuotesBase,
  SortOrder,
  selectBridgeFeatureFlags as selectBridgeFeatureFlagsBase,
  DEFAULT_FEATURE_FLAG_CONFIG,
  isNonEvmChainId,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import {
  BridgeToken,
  BridgeViewMode,
} from '../../../../components/UI/Bridge/types';
import { MetaMetrics } from '../../../Analytics';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { getTokenExchangeRate } from '../../../../components/UI/Bridge/utils/exchange-rates';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { hasMinimumRequiredVersion } from './utils/hasMinimumRequiredVersion';
import { Bip44TokensForDefaultPairs } from '../../../../components/UI/Bridge/constants/default-swap-dest-tokens';

export const selectBridgeControllerState = (state: RootState) =>
  state.engine.backgroundState?.BridgeController;

export interface BridgeState {
  sourceAmount: string | undefined;
  destAmount: string | undefined;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  destAddress: string | undefined;
  selectedSourceChainIds: (Hex | CaipChainId)[] | undefined;
  selectedDestChainId: Hex | CaipChainId | undefined;
  slippage: string | undefined;
  isSubmittingTx: boolean;
  bridgeViewMode: BridgeViewMode | undefined;
  isMaxSourceAmount?: boolean;
  isSelectingRecipient: boolean;
  isSelectingToken: boolean;
  isGasIncludedSTXSendBundleSupported: boolean;
  isGasIncluded7702Supported: boolean;
  /**
   * Tracks whether the user has manually selected a destination token.
   * When true, changing the source token to a different network won't auto-update the dest token.
   * When false, changing source network will update dest to the default for that network.
   */
  isDestTokenManuallySet: boolean;
  /**
   * Network filter for the token selector screen.
   * When set, only tokens from this chain are shown.
   * When undefined, tokens from all chains are shown ("All" filter).
   */
  tokenSelectorNetworkFilter: CaipChainId | undefined;
}

export const initialState: BridgeState = {
  sourceAmount: undefined,
  destAmount: undefined,
  sourceToken: undefined,
  destToken: undefined,
  destAddress: undefined,
  selectedSourceChainIds: undefined,
  selectedDestChainId: undefined,
  slippage: '0.5',
  isSubmittingTx: false,
  bridgeViewMode: undefined,
  isMaxSourceAmount: false,
  isSelectingRecipient: false,
  isSelectingToken: false,
  isGasIncludedSTXSendBundleSupported: false,
  isGasIncluded7702Supported: false,
  isDestTokenManuallySet: false,
  tokenSelectorNetworkFilter: undefined,
};

const name = 'bridge';

export const setSourceTokenExchangeRate = createAsyncThunk(
  'bridge/setSourceTokenExchangeRate',
  getTokenExchangeRate,
);

export const setDestTokenExchangeRate = createAsyncThunk(
  'bridge/setDestTokenExchangeRate',
  getTokenExchangeRate,
);

const slice = createSlice({
  name,
  initialState,
  reducers: {
    setBridgeViewMode: (state, action: PayloadAction<BridgeViewMode>) => {
      state.bridgeViewMode = action.payload;
    },
    setSourceAmount: (state, action: PayloadAction<string | undefined>) => {
      state.sourceAmount = action.payload;
      // Clears max flag when amount is set via keypad
      state.isMaxSourceAmount = false;
    },
    setSourceAmountAsMax: (
      state,
      action: PayloadAction<string | undefined>,
    ) => {
      state.sourceAmount = action.payload;
      state.isMaxSourceAmount = true;
    },
    setDestAmount: (state, action: PayloadAction<string | undefined>) => {
      state.destAmount = action.payload;
    },
    setSelectedSourceChainIds: (
      state,
      action: PayloadAction<(Hex | CaipChainId)[]>,
    ) => {
      state.selectedSourceChainIds = action.payload;
    },
    setSelectedDestChainId: (
      state,
      action: PayloadAction<Hex | CaipChainId | undefined>,
    ) => {
      state.selectedDestChainId = action.payload;
    },
    resetBridgeState: () => initialState,
    setSourceToken: (state, action: PayloadAction<BridgeToken | undefined>) => {
      state.sourceToken = action.payload;
    },
    setDestToken: (state, action: PayloadAction<BridgeToken>) => {
      state.destToken = action.payload;
      // Update selectedDestChainId to match the destination token's chain ID
      state.selectedDestChainId = action.payload.chainId;
    },
    /**
     * Sets whether the destination token was manually selected by the user.
     * When true, auto-updates to dest token are prevented when source chain changes.
     */
    setIsDestTokenManuallySet: (state, action: PayloadAction<boolean>) => {
      state.isDestTokenManuallySet = action.payload;
    },
    setDestAddress: (state, action: PayloadAction<string | undefined>) => {
      state.destAddress = action.payload;
    },
    setSlippage: (state, action: PayloadAction<string | undefined>) => {
      state.slippage = action.payload;
    },
    setIsSubmittingTx: (state, action: PayloadAction<boolean>) => {
      state.isSubmittingTx = action.payload;
    },
    setIsSelectingRecipient: (state, action: PayloadAction<boolean>) => {
      state.isSelectingRecipient = action.payload;
    },
    setIsSelectingToken: (state, action: PayloadAction<boolean>) => {
      state.isSelectingToken = action.payload;
    },
    setIsGasIncludedSTXSendBundleSupported: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isGasIncludedSTXSendBundleSupported = action.payload;
    },
    setIsGasIncluded7702Supported: (state, action: PayloadAction<boolean>) => {
      state.isGasIncluded7702Supported = action.payload;
    },
    setTokenSelectorNetworkFilter: (
      state,
      action: PayloadAction<CaipChainId | undefined>,
    ) => {
      state.tokenSelectorNetworkFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setSourceTokenExchangeRate.pending, (state) => {
      if (state.sourceToken) {
        state.sourceToken.currencyExchangeRate = undefined;
      }
    });
    builder.addCase(setDestTokenExchangeRate.pending, (state) => {
      if (state.destToken) {
        state.destToken.currencyExchangeRate = undefined;
      }
    });
    builder.addCase(setSourceTokenExchangeRate.fulfilled, (state, action) => {
      if (
        state.sourceToken &&
        // Make sure the fetched exchange rate is for the correct token
        action.meta.arg.chainId === state.sourceToken.chainId &&
        action.meta.arg.tokenAddress === state.sourceToken.address
      ) {
        state.sourceToken.currencyExchangeRate = action.payload ?? undefined;
      }
    });
    builder.addCase(setDestTokenExchangeRate.fulfilled, (state, action) => {
      if (
        state.destToken &&
        // Make sure the fetched exchange rate is for the correct token
        action.meta.arg.chainId === state.destToken.chainId &&
        action.meta.arg.tokenAddress === state.destToken.address
      ) {
        state.destToken.currencyExchangeRate = action.payload ?? undefined;
      }
    });
  },
});

const { actions, reducer } = slice;

export default reducer;

// Base selectors
const selectBridgeState = (state: RootState) => state[name];

// Derived selectors using createSelector
export const selectSourceAmount = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.sourceAmount,
);

export const selectDestAmount = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destAmount,
);

export const selectIsMaxSourceAmount = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.isMaxSourceAmount ?? false,
);

export const selectBridgeViewMode = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.bridgeViewMode,
);

export const selectBridgeFeatureFlags = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const bridgeConfig = remoteFeatureFlags.bridgeConfigV2;

    const featureFlags = selectBridgeFeatureFlagsBase({
      remoteFeatureFlags: {
        bridgeConfig,
      },
    });

    if (hasMinimumRequiredVersion(featureFlags.minimumVersion)) {
      return featureFlags;
    }

    return selectBridgeFeatureFlagsBase({
      remoteFeatureFlags: {
        bridgeConfig: DEFAULT_FEATURE_FLAG_CONFIG,
      },
    });
  },
);

/**
 * Checks whether a CAIP chain ID from chainRanking is supported by this version of the client.
 * This ensures that chains added to the remote chainRanking flag in the future
 * won't be surfaced by older app versions that lack support for them.
 */
const isAllowedBridgeChainId = (caipChainId: string): boolean => {
  if (caipChainId.startsWith('eip155:')) {
    const hexChainId = formatChainIdToHex(caipChainId);
    return ALLOWED_BRIDGE_CHAIN_IDS.includes(
      hexChainId as AllowedBridgeChainIds,
    );
  }
  return ALLOWED_BRIDGE_CHAIN_IDS.includes(
    caipChainId as AllowedBridgeChainIds,
  );
};

/**
 * Base selector: filters chainRanking from feature flags by ALLOWED_BRIDGE_CHAIN_IDS.
 * This is the single place where the allowlist check is applied to chainRanking.
 * All other chain ranking selectors should derive from this.
 */
const selectAllowedChainRanking = createSelector(
  selectBridgeFeatureFlags,
  (bridgeFeatureFlags) =>
    (bridgeFeatureFlags.chainRanking ?? []).filter((chain) =>
      isAllowedBridgeChainId(chain.chainId),
    ),
);

/**
 * Selector that returns all chains from chainRanking that are supported by this
 * version of the client (filtered by ALLOWED_BRIDGE_CHAIN_IDS).
 * Used by NetworkPills in DEST mode to show all available destination networks.
 */
export const selectDestChainRanking = selectAllowedChainRanking;

/**
 * Selector that returns the chainRanking filtered by:
 * 1. Chains supported by this version of the client (via selectAllowedChainRanking)
 * 2. User-configured networks
 * Used by NetworkPills in SOURCE mode to show all networks the user has added.
 */
export const selectSourceChainRanking = createSelector(
  selectAllowedChainRanking,
  selectNetworkConfigurations,
  (allowedChains, networkConfigurations) => {
    const configuredChainIds = new Set(Object.keys(networkConfigurations));

    return allowedChains.filter((chain) => {
      const { chainId } = chain;

      // For EVM chains (eip155:*), extract the hex chain ID and check if user has it configured
      if (chainId.startsWith('eip155:')) {
        const hexChainId = formatChainIdToHex(chainId);
        return configuredChainIds.has(hexChainId);
      }

      // For non-EVM chains, check directly against the CAIP chain ID
      return configuredChainIds.has(chainId);
    });
  },
);

/**
 * Factory selector that returns a function to check if bridge is enabled for a source chain.
 * Use this when you need to check multiple chain IDs or when the chain ID is determined after render.
 * @example
 * const getIsBridgeEnabledSource = useSelector(selectIsBridgeEnabledSourceFactory);
 * const isBridgeEnabledSource = getIsBridgeEnabledSource(chainId);
 */
export const selectIsBridgeEnabledSourceFactory = createSelector(
  selectAllowedChainRanking,
  (allowedChains) => (chainId: Hex | CaipChainId) => {
    const caipChainId = formatChainIdToCaip(chainId);
    return allowedChains.some((chain) => chain.chainId === caipChainId);
  },
);

/**
 * Selector that determines if swap functionality is enabled
 * Combines all the conditions needed for swap functionality to be available
 */
export const selectIsSwapsEnabled = createSelector(
  [selectCanSignTransactions, selectBasicFunctionalityEnabled],
  (canSignTransactions, basicFunctionalityEnabled) =>
    canSignTransactions && basicFunctionalityEnabled,
);

export const selectTopAssetsFromFeatureFlags = createSelector(
  selectBridgeFeatureFlags,
  (_: RootState, chainId: Hex | CaipChainId | undefined) => chainId,
  (bridgeFeatureFlags, chainId) =>
    chainId
      ? bridgeFeatureFlags.chains[formatChainIdToCaip(chainId)]?.topAssets
      : undefined,
);

/**
 * Returns full MultichainNetworkConfiguration objects for networks that are both:
 * 1. In the allowed chainRanking (supported by this client version + enabled via feature flags)
 * 2. Configured by the user
 * TODO The MultichainNetworkConfiguration.chainId type is wrong. It can be both Hex or CaipChainId.
 */
export const selectEnabledSourceChains = createSelector(
  selectAllowedChainRanking,
  selectNetworkConfigurations,
  (allowedChainRanking, networkConfigurations) => {
    const allowedCaipIds = new Set(allowedChainRanking.map((c) => c.chainId));
    return uniqBy(Object.values(networkConfigurations), 'chainId').filter(
      ({ chainId }) => allowedCaipIds.has(formatChainIdToCaip(chainId)),
    );
  },
);

// Combined selectors for related state
export const selectSourceToken = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.sourceToken,
);

export const selectDestToken = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destToken,
);

export const selectSelectedSourceChainIds = createSelector(
  selectBridgeState,
  selectEnabledSourceChains,
  (bridgeState, enabledSourceChains) => {
    // If selectedSourceChainIds is undefined, use the chainIds from enabledSourceChains
    if (bridgeState.selectedSourceChainIds === undefined) {
      return enabledSourceChains.map((chain) => chain.chainId);
    }
    return bridgeState.selectedSourceChainIds;
  },
);

export const selectSelectedDestChainId = createSelector(
  selectBridgeState,
  selectSourceToken,
  (bridgeState, sourceToken) => {
    // If selectedDestChainIds is undefined, use the same chain as the source token
    if (bridgeState.selectedDestChainId === undefined) {
      return sourceToken?.chainId;
    }
    return bridgeState.selectedDestChainId;
  },
);

export const selectSlippage = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.slippage,
);

export const selectDestAddress = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destAddress,
);

// Selectors for gas included STX/SendBundle support
export const selectIsGasIncludedSTXSendBundleSupported = (state: RootState) =>
  state.bridge.isGasIncludedSTXSendBundleSupported;

// Selector for 7702 gas included support
export const selectIsGasIncluded7702Supported = (state: RootState) =>
  state.bridge.isGasIncluded7702Supported;

const selectControllerFields = (state: RootState) => ({
  ...state.engine.backgroundState.BridgeController,
  gasFeeEstimatesByChainId:
    state.engine.backgroundState.GasFeeController.gasFeeEstimatesByChainId ??
    {},
  ...state.engine.backgroundState.MultichainAssetsRatesController,
  ...state.engine.backgroundState.TokenRatesController,
  ...state.engine.backgroundState.CurrencyRateController,
  participateInMetaMetrics: MetaMetrics.getInstance().isEnabled(),
  remoteFeatureFlags: {
    bridgeConfig: selectRemoteFeatureFlags(state).bridgeConfig,
  },
});

export const selectBridgeQuotes = createSelector(
  selectControllerFields,
  (requiredControllerFields) =>
    selectBridgeQuotesBase(requiredControllerFields, {
      sortOrder: SortOrder.COST_ASC, // TODO for v1 we don't allow user to select alternative quotes, hardcode for now
      selectedQuote: null, // TODO for v1 we don't allow user to select alternative quotes, pass in null for now
    }),
);

export const selectIsSolanaSourced = createSelector(
  selectSourceToken,
  (sourceToken) => sourceToken?.chainId && isSolanaChainId(sourceToken.chainId),
);

export const selectIsSolanaToNonSolana = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    isSolanaChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    !isSolanaChainId(destToken.chainId),
);

export const selectIsEvmToNonEvm = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    !isNonEvmChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    isNonEvmChainId(destToken.chainId),
);

export const selectIsNonEvmToEvm = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    isNonEvmChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    !isNonEvmChainId(destToken.chainId),
);

export const selectIsNonEvmNonEvmBridge = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    isNonEvmChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    isNonEvmChainId(destToken.chainId) &&
    sourceToken.chainId !== destToken.chainId,
);

export const selectIsSolanaSwap = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    isSolanaChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    isSolanaChainId(destToken.chainId),
);

export const selectIsEvmNonEvmBridge = createSelector(
  selectIsEvmToNonEvm,
  selectIsNonEvmToEvm,
  (isEvmToNonEvm, isNonEvmToEvm) => isEvmToNonEvm || isNonEvmToEvm,
);

export const selectIsBridge = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    destToken?.chainId &&
    sourceToken.chainId !== destToken.chainId,
);

export const selectIsSwap = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    destToken?.chainId &&
    sourceToken.chainId === destToken.chainId,
);

/**
 * Selector that returns the gas included quote params for bridge and swap transactions.
 * Combines isSwap, STX/SendBundle support, and 7702 support to determine the correct
 * gas included parameters.
 */
export const selectGasIncludedQuoteParams = createSelector(
  [
    selectIsSwap,
    selectIsGasIncludedSTXSendBundleSupported,
    selectIsGasIncluded7702Supported,
  ],
  (isSwap, gasIncludedSTXSendBundleSupport, gasIncluded7702Support) => {
    // If STX send bundle support is true, we favor it over 7702.
    if (gasIncludedSTXSendBundleSupport) {
      return { gasIncluded: true, gasIncluded7702: false };
    }

    // If 7702 support is true, we use it for swap transactions.
    const gasIncludedWith7702Enabled =
      Boolean(isSwap) && gasIncluded7702Support;

    return {
      gasIncluded: gasIncludedWith7702Enabled,
      gasIncluded7702: gasIncludedWith7702Enabled,
    };
  },
);

export const selectIsEvmSwap = createSelector(
  selectIsSwap,
  selectIsSolanaSwap,
  (isSwap, isSolanaSwap) => isSwap && !isSolanaSwap,
);

export const selectIsSubmittingTx = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.isSubmittingTx,
);

export const selectIsSelectingRecipient = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.isSelectingRecipient,
);

export const selectIsSelectingToken = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.isSelectingToken,
);

export const selectTokenSelectorNetworkFilter = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.tokenSelectorNetworkFilter,
);

export const selectIsDestTokenManuallySet = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.isDestTokenManuallySet,
);

export const selectIsGaslessSwapEnabled = createSelector(
  selectIsSwap,
  selectBridgeFeatureFlags,
  (_: RootState, chainId: Hex | CaipChainId) => chainId,
  (isSwap, bridgeFeatureFlags, chainId) => {
    const caipChainId = formatChainIdToCaip(chainId);
    const chainConfig = bridgeFeatureFlags.chains[caipChainId];
    return isSwap && chainConfig?.isGaslessSwapEnabled === true;
  },
);

export const selectNoFeeAssets = createSelector(
  selectBridgeFeatureFlags,
  (_: RootState, chainId: Hex | CaipChainId | undefined) => chainId,
  (bridgeFeatureFlags, chainId) => {
    if (!chainId) {
      return [];
    }
    const caipChainId = formatChainIdToCaip(chainId);
    return bridgeFeatureFlags.chains[caipChainId]?.noFeeAssets;
  },
);

export const selectBip44DefaultPair = createSelector(
  selectBridgeFeatureFlags,
  selectChainId,
  (bridgeFeatureFlags, chainId) => {
    const caipChainId = formatChainIdToCaip(chainId);
    const { namespace } = parseCaipChainId(caipChainId);
    const bip44DefaultPair =
      bridgeFeatureFlags.bip44DefaultPairs?.[namespace]?.standard;

    if (!bip44DefaultPair) {
      return undefined;
    }

    // If 0th entry doesn't exist, error thrown and we return undefined
    const pairs = Object.entries(bip44DefaultPair);
    const sourceAssetId = pairs[0]?.[0];
    const destAssetId = pairs[0]?.[1];
    const sourceAsset =
      Bip44TokensForDefaultPairs[sourceAssetId as CaipAssetType];
    const destAsset = Bip44TokensForDefaultPairs[destAssetId as CaipAssetType];

    if (!sourceAsset || !destAsset) {
      return undefined;
    }

    return { sourceAsset, destAsset };
  },
);

export const selectIsBridgeEnabledSource = createSelector(
  selectIsBridgeEnabledSourceFactory,
  (_: RootState, chainId: Hex | CaipChainId) => chainId,
  (getIsBridgeEnabledSource, chainId) => getIsBridgeEnabledSource(chainId),
);

// Actions
export const {
  setSourceAmount,
  setSourceAmountAsMax,
  setDestAmount,
  resetBridgeState,
  setSourceToken,
  setDestToken,
  setIsDestTokenManuallySet,
  setSelectedSourceChainIds,
  setSelectedDestChainId,
  setSlippage,
  setDestAddress,
  setIsSubmittingTx,
  setBridgeViewMode,
  setIsSelectingRecipient,
  setIsSelectingToken,
  setIsGasIncludedSTXSendBundleSupported,
  setIsGasIncluded7702Supported,
  setTokenSelectorNetworkFilter,
} = actions;
