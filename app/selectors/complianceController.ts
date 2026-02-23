import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { selectIsWalletBlocked as coreSelectIsWalletBlocked } from '@metamask/compliance-controller';

const selectComplianceControllerState = (state: RootState) =>
  state.engine.backgroundState.ComplianceController;

/**
 * Select the full blocked wallets info object, or null if not yet fetched.
 */
export const selectBlockedWallets = createSelector(
  selectComplianceControllerState,
  (state) => state?.blockedWallets ?? null,
);

/**
 * Create a selector that returns whether a specific wallet address is blocked.
 *
 * Checks the proactively fetched blocklist first, then falls back to
 * the per-address compliance status map.
 *
 * @param address - The wallet address to check.
 * @returns A selector returning `true` if blocked, `false` otherwise.
 */
export const selectIsWalletBlocked = (address: string) =>
  createSelector(selectComplianceControllerState, (state) =>
    state ? coreSelectIsWalletBlocked(address)(state) : false,
  );

/**
 * Select the per-address compliance status map.
 */
export const selectWalletComplianceStatusMap = createSelector(
  selectComplianceControllerState,
  (state) => state?.walletComplianceStatusMap ?? {},
);

/**
 * Select the timestamp of the last compliance check.
 */
export const selectComplianceLastCheckedAt = createSelector(
  selectComplianceControllerState,
  (state) => state?.lastCheckedAt ?? null,
);
