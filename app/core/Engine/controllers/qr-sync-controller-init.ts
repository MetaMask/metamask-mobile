import type { MessengerClientInitFunction } from '../types';

import {
  defaultQrSyncControllerState,
  QrSyncController,
} from '../../QrSync/QrSyncController';
import { RELAY_URL } from '../../QrSync/constants';
import {
  QR_SYNC_CONTROLLER_NAME,
  type QrSyncControllerMessenger,
  type QrSyncControllerState,
} from '../../QrSync/controller-types';
import { KeyManager } from '../../SDKConnectV2/services/key-manager';
import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import { store } from '../../../store';

/**
 * Initializes the QR sync controller with any previously hydrated state.
 *
 * QR sync state is intentionally non-persistent today, but this init function
 * follows the standard controller pattern so the feature can be registered into
 * Engine later without needing architectural changes.
 */
export const qrSyncControllerInit: MessengerClientInitFunction<
  QrSyncController,
  QrSyncControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const qrSyncState =
    ((persistedState as Record<string, unknown>)[QR_SYNC_CONTROLLER_NAME] as
      | Partial<QrSyncControllerState>
      | undefined) ?? defaultQrSyncControllerState;

  const controller = new QrSyncController({
    messenger: controllerMessenger,
    state: qrSyncState,
    keyManager: new KeyManager(),
    relayUrl: RELAY_URL,
    getIsOnboardingCompleted: () => selectCompletedOnboarding(store.getState()),
  });

  return { controller };
};
