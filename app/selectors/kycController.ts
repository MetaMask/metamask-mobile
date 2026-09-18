import type { RootState } from '../reducers';

/**
 * Selects KycController state persisted by Engine.
 *
 * @param state - Redux state.
 * @returns The KYC state, when Engine has initialized it.
 */
export const selectKycControllerState = (state: RootState) =>
  state.engine.backgroundState.KycController;
