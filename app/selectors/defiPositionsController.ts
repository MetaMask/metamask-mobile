import { Hex } from '@metamask/utils';
import { DeFiPositionsControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountAddress } from './accountsController';

const selectDeFiPositionsControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.DeFiPositionsController;

export const selectDeFiPositionsByAddress = createDeepEqualSelector(
  selectDeFiPositionsControllerState,
  selectSelectedInternalAccountAddress,
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedAddress: string | undefined,
  ) => defiPositionsControllerState?.allDeFiPositions[selectedAddress as Hex],
);
