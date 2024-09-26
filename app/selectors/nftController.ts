import { createSelector } from 'reselect';
import { NftControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';

const selectNftControllerState = (state: RootState) =>
  state.engine.backgroundState.NftController;

export const selectAllNftContracts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftControllerState) =>
    nftControllerState.allNftContracts,
);

export const selectAllNfts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftControllerState) => nftControllerState.allNfts,
);
