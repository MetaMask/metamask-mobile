import { createSelector } from 'reselect';
import { NftState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';

const selectNftControllerState = (state: RootState) =>
  state.engine.backgroundState.NftController;

export const selectAllNftContracts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftState) => nftControllerState.allNftContracts,
);

export const selectAllNfts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftState) => nftControllerState.allNfts,
);
