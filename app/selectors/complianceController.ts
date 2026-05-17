import { createSelector, type Selector } from 'reselect';
import { memoize } from 'lodash';
import { RootState } from '../reducers';
import { selectIsWalletBlocked as coreSelectIsWalletBlocked } from '@metamask/compliance-controller';

const selectComplianceControllerState = (state: RootState) =>
  state.engine.backgroundState.ComplianceController;

/**
 * Memoized factory: same (address) returns the same selector instance so reselect caching works.
 */
const getSelectIsWalletBlocked = memoize((address: string) =>
  createSelector(selectComplianceControllerState, (state) =>
    state ? coreSelectIsWalletBlocked(address)(state) : false,
  ),
);

/**
 * Create a selector that returns whether a specific wallet address is blocked.
 *
 * Reads from the per-address `walletComplianceStatusMap` which is populated by
 * `checkWalletCompliance` calls. Selector instances are cached per address.
 *
 * @param address - The wallet address to check.
 * @returns A selector returning `true` if blocked, `false` otherwise.
 */
export const selectIsWalletBlocked = (
  address: string,
): Selector<RootState, boolean> => getSelectIsWalletBlocked(address);

/**
 * Memoized factory: same address set (order-independent) returns the same selector instance.
 * Inner loop uses coreSelectIsWalletBlocked(addr)(state) because (state) here is the
 * compliance controller slice, not root state.
 */
const getSelectAreAnyWalletsBlocked = memoize(
  (addresses: string[]) =>
    createSelector(selectComplianceControllerState, (state) => {
      if (!state || addresses.length === 0) return false;
      return addresses.some((addr) => coreSelectIsWalletBlocked(addr)(state));
    }),
  (addresses: string[]) =>
    [...addresses].sort((a, b) => a.localeCompare(b)).join(','),
);

/**
 * Create a selector that returns whether ANY of the given addresses is blocked.
 * Useful for multichain account groups where one group has addresses across
 * multiple chains (EVM, Solana, Bitcoin, etc.). Selector instances are cached per address set.
 *
 * @param addresses - The wallet addresses to check.
 * @returns A selector returning `true` if any address is blocked.
 */
export const selectAreAnyWalletsBlocked = (
  addresses: string[],
): Selector<RootState, boolean> => getSelectAreAnyWalletsBlocked(addresses);

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
