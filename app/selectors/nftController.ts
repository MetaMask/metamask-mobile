import { createSelector } from 'reselect';
import { NftState } from '@metamask/assets-controllers';
import { EngineState } from './types';

const selectNftControllerState = (state: EngineState) =>
  state.engine.backgroundState.NftController;

export const selectAllNftContracts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftState) => nftControllerState.allNftContracts,
);

export const selectAllNfts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftState) => nftControllerState.allNfts,
);
