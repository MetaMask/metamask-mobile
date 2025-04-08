import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex, isCaipChainId } from '@metamask/utils';
import { ethers } from 'ethers';
import { createSelector } from 'reselect';
import { selectTokens } from '../../../../selectors/tokensController';
import { getNativeSwapsToken } from '@metamask/swaps-controller/dist/swapsUtil';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import { uniqBy } from 'lodash';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  AllowedBridgeChainIds,
  BridgeFeatureFlagsKey,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../../../../components/UI/Bridge/types';
import { PopularList } from '../../../../util/networks/customNetworks';

export const selectBridgeControllerState = (state: RootState) =>
  state.engine.backgroundState?.BridgeController;

export interface BridgeState {
  sourceAmount: string | undefined;
  destAmount: string | undefined;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  selectedSourceChainIds: undefined | string[];
  selectedDestChainId: SupportedCaipChainId | Hex | undefined;
  slippage: string;
}

export const initialState: BridgeState = {
  sourceAmount: undefined,
  destAmount: undefined,
  sourceToken: undefined,
  destToken: undefined,
  selectedSourceChainIds: undefined,
  selectedDestChainId: undefined,
  slippage: '0.5',
};

const name = 'bridge';

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
    setSelectedSourceChainIds: (state, action: PayloadAction<string[]>) => {
      state.selectedSourceChainIds = action.payload;
    },
    setSelectedDestChainId: (
      state,
      action: PayloadAction<SupportedCaipChainId | Hex | undefined>,
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
    setSlippage: (state, action: PayloadAction<string>) => {
      state.slippage = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Base selectors
const selectBridgeState = (state: RootState) => state[name];
const selectTokensList = selectTokens;

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
  selectEvmNetworkConfigurationsByChainId,
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
  selectBridgeControllerState,
  (bridgeControllerState) => bridgeControllerState.bridgeFeatureFlags,
);

export const selectEnabledSourceChains = createSelector(
  selectAllBridgeableNetworks,
  selectBridgeFeatureFlags,
  (networks, bridgeFeatureFlags) =>
    networks.filter(
      ({ chainId }) =>
        bridgeFeatureFlags[BridgeFeatureFlagsKey.MOBILE_CONFIG].chains[
          formatChainIdToCaip(chainId)
        ]?.isActiveSrc,
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
        bridgeFeatureFlags[BridgeFeatureFlagsKey.MOBILE_CONFIG].chains[
          formatChainIdToCaip(chainId)
        ]?.isActiveDest,
    );
  },
);

// Combined selectors for related state
export const selectSourceToken = createSelector(
  selectBridgeState,
  selectTokensList,
  selectEvmChainId,
  (bridgeState, tokens, currentChainId) => {
    // If we have a selected source token in the bridge state, use that
    if (bridgeState.sourceToken) {
      return bridgeState.sourceToken;
    }

    // Otherwise, fall back to the native token of current chain
    const sourceToken = !isCaipChainId(currentChainId)
      ? getNativeSwapsToken(currentChainId)
      : tokens.find((token) => token.address === ethers.constants.AddressZero);

    if (!sourceToken) return undefined;

    const sourceTokenFormatted: BridgeToken = {
      address: sourceToken.address,
      name: sourceToken.name ?? '',
      symbol: sourceToken.symbol,
      image: 'iconUrl' in sourceToken ? sourceToken.iconUrl : '',
      decimals: sourceToken.decimals,
      chainId: currentChainId as Hex,
    };

    return sourceTokenFormatted;
  },
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
} = actions;
