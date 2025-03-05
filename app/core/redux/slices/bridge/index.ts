import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex, isCaipChainId } from '@metamask/utils';
import { ethers } from 'ethers';
import { createSelector } from 'reselect';
import { selectTokens } from '../../../../selectors/tokensController';
import { getNativeSwapsToken } from '@metamask/swaps-controller/dist/swapsUtil';
import { BridgeToken } from '../../../../components/UI/Bridge/types';
import { selectChainId } from '../../../../selectors/networkController';

export interface BridgeState {
  sourceAmount: string | undefined;
  destAmount: string | undefined;
  sourceChainId: SupportedCaipChainId | Hex;
  destChainId: SupportedCaipChainId | Hex | undefined;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
}

const initialState: BridgeState = {
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

export const selectSourceChainId = createSelector(
  selectChainId,
  (chainId) => chainId,
);

export const selectDestChainId = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destChainId,
);

// Combined selectors for related state
export const selectSourceToken = createSelector(
  selectBridgeState,
  selectTokensList,
  (bridgeState, tokens) => {
    const { sourceChainId } = bridgeState;
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
} = actions;
