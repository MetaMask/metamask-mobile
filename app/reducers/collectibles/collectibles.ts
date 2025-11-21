import { createSelector } from 'reselect';
import type { Hex } from '@metamask/utils';
import type { RootState } from '../index';
import { selectSelectedInternalAccountAddress } from '../../selectors/accountsController';
import { selectAllNfts } from '../../selectors/nftController';

export const selectAllCollectiblesByChain = createSelector(
  [
    selectAllNfts,
    selectSelectedInternalAccountAddress,
    (_: RootState, chainId: Hex) => chainId,
  ],
  (allNftContracts, address, chainId) => {
    if (!address) {
      return [];
    }
    return allNftContracts?.[address]?.[chainId] || [];
  },
);
