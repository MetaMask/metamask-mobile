import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';
import { createSelector } from 'reselect';

export interface BridgeState {
  sourceAmount: string | undefined;
  destAmount: string | undefined;
  sourceTokenAddress: string;
  destTokenAddress: string | undefined;
  sourceChainId: SupportedCaipChainId | Hex;
  destChainId: SupportedCaipChainId | Hex | undefined;
}

const initialState: BridgeState = {
  sourceAmount: undefined,
  destAmount: undefined,
  sourceTokenAddress: ethers.constants.AddressZero,
  destTokenAddress: undefined,
  sourceChainId: '0x1',
  destChainId: undefined,
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
    setSourceTokenAddress: (state, action: PayloadAction<string>) => {
      state.sourceTokenAddress = action.payload;
    },
    setDestTokenAddress: (state, action: PayloadAction<string | undefined>) => {
      state.destTokenAddress = action.payload;
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

// Base selector
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

export const selectSourceTokenAddress = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.sourceTokenAddress,
);

export const selectDestTokenAddress = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destTokenAddress,
);

export const selectSourceChainId = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.sourceChainId,
);

export const selectDestChainId = createSelector(
  selectBridgeState,
  (bridgeState) => bridgeState.destChainId,
);

// Combined selectors for related state
export const selectSourceTokenState = createSelector(
  selectBridgeState,
  (bridgeState) => ({
    amount: bridgeState.sourceAmount,
    tokenAddress: bridgeState.sourceTokenAddress,
    chainId: bridgeState.sourceChainId,
  }),
);

export const selectDestTokenState = createSelector(
  selectBridgeState,
  (bridgeState) => ({
    amount: bridgeState.destAmount,
    tokenAddress: bridgeState.destTokenAddress,
    chainId: bridgeState.destChainId,
  }),
);

// Actions
export const {
  setSourceAmount,
  setDestAmount,
  setSourceTokenAddress,
  setDestTokenAddress,
  setSourceChainId,
  setDestChainId,
  resetBridgeState,
} = actions;
