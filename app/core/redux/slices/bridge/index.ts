import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex, isCaipChainId } from '@metamask/utils';
import { ethers } from 'ethers';
import { createSelector } from 'reselect';
import { selectTokens } from '../../../../selectors/tokensController';
import { getNativeSwapsToken } from '@metamask/swaps-controller/dist/swapsUtil';
import { BridgeToken } from '../../../../components/UI/Bridge/types';
import { selectChainId, selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { uniqBy } from 'lodash';
import { ALLOWED_BRIDGE_CHAIN_IDS, AllowedBridgeChainIds, BridgeFeatureFlagsKey } from '@metamask/bridge-controller';

export const selectBridgeControllerState = (state: RootState) =>
  state.engine.backgroundState?.BridgeController;

export interface BridgeState {
  sourceAmount: string | undefined;
  destAmount: string | undefined;
  sourceChainId: SupportedCaipChainId | Hex;
  destChainId: SupportedCaipChainId | Hex | undefined;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
}

export const initialState: BridgeState = {
  sourceAmount: undefined,
  destAmount: undefined,
  sourceChainId: '0x1',
  destChainId: undefined,
  sourceToken: undefined,
  destToken: undefined,
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
    setSourceChainId: (state, action: PayloadAction<SupportedCaipChainId | Hex>) => {
      state.sourceChainId = action.payload;
    },
    setDestChainId: (state, action: PayloadAction<SupportedCaipChainId | Hex | undefined>) => {
      state.destChainId = action.payload;
    },
    resetBridgeState: () => initialState,
    switchTokens: (state) => {
      // Don't switch if destination chain or token is undefined
      if (!state.destChainId || !state.destToken) {
        return;
      }

      // Switch tokens
      const tempToken = state.sourceToken;
      state.sourceToken = state.destToken;
      state.destToken = tempToken;

      // Switch chain IDs
      const tempChainId = state.sourceChainId;
      state.sourceChainId = state.destChainId;
      state.destChainId = tempChainId;

      // Reset amounts
      state.sourceAmount = undefined;
      state.destAmount = undefined;
    },
    setSourceToken: (state, action: PayloadAction<BridgeToken>) => {
      state.sourceToken = action.payload;
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

// only includes networks user has added
// will include them regardless of feature flag enabled or not
export const selectAllBridgeableNetworks = createSelector(
  selectEvmNetworkConfigurationsByChainId,
  (networkConfigurations) => {
    const networks = uniqBy(
      Object.values(networkConfigurations),
      'chainId'
    ).filter(({ chainId }) =>
      ALLOWED_BRIDGE_CHAIN_IDS.includes(chainId as AllowedBridgeChainIds)
    );

    return networks;
  }
);

export const selectBridgeFeatureFlags = createSelector(
  selectBridgeControllerState,
  (bridgeControllerState) => bridgeControllerState.bridgeFeatureFlags,
);

export const selectEnabledSourceChains = createSelector(
  selectAllBridgeableNetworks,
  selectBridgeFeatureFlags,
  (networks, bridgeFeatureFlags) => networks.filter(({ chainId }) =>
    bridgeFeatureFlags[BridgeFeatureFlagsKey.MOBILE_CONFIG].chains[chainId]?.isActiveSrc)
);

export const selectSourceChainId = createSelector(
  selectChainId,
  (chainId) => chainId,
);

export const getEnabledDestChains = createSelector(
  selectAllBridgeableNetworks,
  (networks) => networks,
);

export const selectDestChainId = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destChainId,
);

// Combined selectors for related state
export const selectSourceToken = createSelector(
  selectBridgeState,
  selectTokensList,
  selectSourceChainId,
  (bridgeState, tokens, sourceChainId) => {
    // If we have a selected source token in the bridge state, use that
    if (bridgeState.sourceToken) {
      return bridgeState.sourceToken;
    }

    // Otherwise, fall back to the native token
    const sourceToken = !isCaipChainId(sourceChainId)
      ? getNativeSwapsToken(sourceChainId)
      : tokens.find((token) => token.address === ethers.constants.AddressZero);

    if (!sourceToken) return undefined;

    return {
      address: sourceToken.address,
      symbol: sourceToken.symbol,
      image: 'iconUrl' in sourceToken ? sourceToken.iconUrl : '',
      decimals: sourceToken.decimals,
      chainId: sourceChainId as SupportedCaipChainId,
    } as BridgeToken;
  },
);

export const selectDestToken = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destToken,
);

// Actions
export const {
  setSourceAmount,
  setDestAmount,
  setSourceChainId,
  setDestChainId,
  resetBridgeState,
  switchTokens,
  setSourceToken,
} = actions;
