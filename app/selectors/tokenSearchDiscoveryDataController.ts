import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { Hex } from '@metamask/utils';

const selectTokenSearchDiscoveryDataControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenSearchDiscoveryDataController;

export const selectTokenDisplayData = createSelector(
  selectTokenSearchDiscoveryDataControllerState,
  (_state: RootState, chainId: Hex) => chainId,
  (_state: RootState, _chainId: Hex, address: string) => address,
  (state, chainId, address) => {
    console.log('>>>>>>>>> statez', state);
    return state?.tokenDisplayData.find(d => d.chainId === chainId && d.address === address);
  }
);
