import { createSelector } from 'reselect';
import { CONNECTIVITY_STATUSES } from '@metamask/connectivity-controller';
import { RootState } from '../reducers';

const selectConnectivityControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.ConnectivityController;

/**
 * Selector to get the connectivity status from ConnectivityController.
 *
 * @param state - The root state.
 * @returns The connectivity status ('online' | 'offline').
 */
export const selectConnectivityStatus = createSelector(
  [selectConnectivityControllerState],
  (connectivityState) =>
    connectivityState?.connectivityStatus ?? CONNECTIVITY_STATUSES.Online,
);

/**
 * Selector to check if the device is offline.
 *
 * @param state - The root state.
 * @returns True if the device is offline, false otherwise.
 */
export const selectIsDeviceOffline = createSelector(
  [selectConnectivityStatus],
  (connectivityStatus) => connectivityStatus === CONNECTIVITY_STATUSES.Offline,
);
