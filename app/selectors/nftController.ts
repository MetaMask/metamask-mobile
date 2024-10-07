import { createSelector } from 'reselect';
import { Nft, NftState } from '@metamask/assets-controllers';
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

export const selectAllNftsFlat = createSelector(
  selectAllNfts,
  (nftsByChainByAccount) => {
    const nftsByChainArray = Object.values(nftsByChainByAccount);
    return nftsByChainArray.reduce((acc, nftsByChain) => {
      const nftsArrays = Object.values(nftsByChain);
      return acc.concat(...nftsArrays);
    }, [] as Nft[]);
  },
);
