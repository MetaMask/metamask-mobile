import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import type { DepositStatus } from '../../controllers/types';

const selectPerpsControllerState = (state: RootState) =>
  state.engine.backgroundState.PerpsController;

const selectPerpsProvider = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState.activeProvider,
);

const selectPerpsAccountState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.accountState || null,
);

const selectPerpsDepositState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    if (!perpsControllerState) {
      return {
        status: 'idle' as DepositStatus,
        currentTxHash: null as string | null,
        error: null as string | null,
      };
    }

    return {
      status: perpsControllerState.depositStatus || 'idle',
      currentTxHash: perpsControllerState.currentDepositTxHash || null,
      error: perpsControllerState.depositError || null,
    };
  },
);

const selectPerpsEligibility = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.isEligible || false,
);

const selectPerpsNetwork = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) =>
    perpsControllerState?.isTestnet ? 'testnet' : 'mainnet',
);

export {
  selectPerpsProvider,
  selectPerpsAccountState,
  selectPerpsDepositState,
  selectPerpsEligibility,
  selectPerpsNetwork,
};
