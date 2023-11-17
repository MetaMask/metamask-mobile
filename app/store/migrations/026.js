import { cloneDeep } from 'lodash';
import { captureException } from '@sentry/react-native';

export const version = 25;

/**
 * This migration is to free space of unused data in the user devices
 * regarding the phishing list property listState, that is no longer used
 * 
 * @param originalVersionedData - Versioned MetaMask extension state, exactly what we persist to dist.
 * @param originalVersionedData.meta - State metadata.
 * @param originalVersionedData.meta.version - The current state version.
 * @param originalVersionedData.data - The persisted MetaMask state, keyed by controller.
 * @returns Updated versioned MetaMask extension state.
 */
export function migrate(originalVersionedData) {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  versionedData.data = transformState(versionedData.data);
  return versionedData;
}

function transformState(state) {
  const phishingControllerState =
      state.engine.backgroundState.PhishingController;
    if (phishingControllerState?.listState) {
      delete state.engine.backgroundState.PhishingController.listState;
    } else {
      captureException(
        new Error(
          `Migration 26: Invalid PhishingControllerState controller state: '${JSON.stringify(
            state.engine.backgroundState.PhishingController,
          )}'`,
        ),
      );
    }

    if (
      phishingControllerState?.hotlistLastFetched &&
      phishingControllerState?.stalelistLastFetched
    ) {
      // This will make the list be fetched again when the user updates the app
      state.engine.backgroundState.PhishingController.hotlistLastFetched = 0;
      state.engine.backgroundState.PhishingController.stalelistLastFetched = 0;
    } else {
      captureException(
        new Error(
          `Migration 26: Invalid PhishingControllerState hotlist and stale list fetched: '${JSON.stringify(
            state.engine.backgroundState.PhishingController,
          )}'`,
        ),
      );
    }

    return state;
}
