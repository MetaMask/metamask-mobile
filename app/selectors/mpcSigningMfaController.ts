import type { RootState } from '../reducers';

/**
 * Select the pending MPC signing MFA request id.
 *
 * @param state - The Redux root state.
 * @returns The pending request id, or null.
 */
export const selectPendingMpcSigningMfaRequestId = (state: RootState) =>
  state.engine.backgroundState.MpcSigningMfaController
    ?.pendingMpcSigningMfaRequestId ?? null;
