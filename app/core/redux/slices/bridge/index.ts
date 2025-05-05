import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { Hex, CaipChainId } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { uniqBy } from 'lodash';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  AllowedBridgeChainIds,
  formatChainIdToCaip,
  isSolanaChainId,
  selectBridgeQuotes as selectBridgeQuotesBase,
  SortOrder,
  selectBridgeFeatureFlags as selectBridgeFeatureFlagsBase,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../../../../components/UI/Bridge/types';
import { PopularList } from '../../../../util/networks/customNetworks';
import { selectGasFeeControllerEstimates } from '../../../../selectors/gasFeeController';
import { MetaMetrics } from '../../../Analytics';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { getTokenExchangeRate } from '../../../../components/UI/Bridge/utils/exchange-rates';

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
    setSourceAmount: (state, action: PayloadAction<string | undefined>) => {
      state.sourceAmount = action.payload;
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

/**
 * Only includes networks user has added.
 * Will include them regardless of feature flag enabled or not.
 */
export const selectAllBridgeableNetworks = createSelector(
  selectNetworkConfigurations,
  (networkConfigurations) => {
    const networks = uniqBy(
      Object.values(networkConfigurations),
      'chainId',
    ).filter(({ chainId }) =>
      ALLOWED_BRIDGE_CHAIN_IDS.includes(chainId as AllowedBridgeChainIds),
    );

    return networks;
  },
);

export const selectBridgeFeatureFlags = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    selectBridgeFeatureFlagsBase({
      remoteFeatureFlags: {
        bridgeConfig: remoteFeatureFlags.bridgeConfig,
      },
    }),
);

export const selectIsBridgeEnabledSource = createSelector(
  selectBridgeFeatureFlags,
  (_: RootState, chainId: Hex | CaipChainId) => chainId,
  (bridgeFeatureFlags, chainId) => {
    const caipChainId = formatChainIdToCaip(chainId);

    return (
      bridgeFeatureFlags.support &&
      bridgeFeatureFlags.chains[caipChainId]?.isActiveSrc
    );
  },
);

export const selectIsBridgeEnabledDest = createSelector(
  selectBridgeFeatureFlags,
  (_: RootState, chainId: Hex | CaipChainId) => chainId,
  (bridgeFeatureFlags, chainId) => {
    const caipChainId = formatChainIdToCaip(chainId);

    return (
      bridgeFeatureFlags.support &&
      bridgeFeatureFlags.chains[caipChainId]?.isActiveDest
    );
  },
);

export const selectTopAssetsFromFeatureFlags = createSelector(
  selectBridgeFeatureFlags,
  (_: RootState, chainId: Hex | CaipChainId | undefined) => chainId,
  (bridgeFeatureFlags, chainId) =>
    chainId
      ? bridgeFeatureFlags.chains[formatChainIdToCaip(chainId)]?.topAssets
      : undefined,
);

export const selectEnabledSourceChains = createSelector(
  selectAllBridgeableNetworks,
  selectBridgeFeatureFlags,
  (networks, bridgeFeatureFlags) =>
    networks.filter(
      ({ chainId }) =>
        bridgeFeatureFlags.chains[formatChainIdToCaip(chainId)]?.isActiveSrc,
    ),
);

export const selectEnabledDestChains = createSelector(
  selectAllBridgeableNetworks,
  selectBridgeFeatureFlags,
  (networks, bridgeFeatureFlags) => {
    // We always want to show the popular list in the destination chain selector
    const popularListFormatted = PopularList.map(
      ({ chainId, nickname, rpcUrl, ticker, rpcPrefs }) => ({
        chainId,
        name: nickname,
        rpcUrl,
        ticker,
        rpcPrefs,
      }),
    );

    return uniqBy([...networks, ...popularListFormatted], 'chainId').filter(
      ({ chainId }) =>
        bridgeFeatureFlags.chains[formatChainIdToCaip(chainId)]?.isActiveDest,
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

const selectControllerFields = (state: RootState) => ({
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

export const selectBridgeQuotes = createSelector(
  selectControllerFields,
  (requiredControllerFields) =>
    selectBridgeQuotesBase(requiredControllerFields, {
      sortOrder: SortOrder.COST_ASC, // TODO for v1 we don't allow user to select alternative quotes, hardcode for now
      selectedQuote: null, // TODO for v1 we don't allow user to select alternative quotes, pass in null for now
    }),
);

export const selectIsEvmToSolana = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    !isSolanaChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    isSolanaChainId(destToken.chainId),
);

export const selectIsSolanaToEvm = createSelector(
  selectSourceToken,
  selectDestToken,
  (sourceToken, destToken) =>
    sourceToken?.chainId &&
    isSolanaChainId(sourceToken.chainId) &&
    destToken?.chainId &&
    !isSolanaChainId(destToken.chainId),
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

export const selectIsEvmSolanaBridge = createSelector(
  selectIsEvmToSolana,
  selectIsSolanaToEvm,
  (isEvmToSolana, isSolanaToEvm) => isEvmToSolana || isSolanaToEvm,
);

export const selectIsSubmittingTx = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.isSubmittingTx,
);

// Actions
export const {
  setSourceAmount,
  setDestAmount,
  resetBridgeState,
  setSourceToken,
  setDestToken,
  setSelectedSourceChainIds,
  setSelectedDestChainId,
  setSlippage,
  setDestAddress,
  setIsSubmittingTx,
} = actions;
