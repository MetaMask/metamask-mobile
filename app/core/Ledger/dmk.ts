import {
  DeviceManagementKitBuilder,
  type DeviceManagementKit,
} from '@ledgerhq/device-management-kit';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { validatedVersionGatedFeatureFlag } from '../../util/remoteFeatureFlag';
import { FeatureFlagNames } from '../../constants/featureFlags';

/**
 * Whether the Ledger DMK stack is enabled, read fresh from the merged feature
 * flags. Pure — no caching; callers pass the current flag state.
 *
 * Resolution: `LEDGER_FORCE_DMK=true` env var (build-time override) takes
 * precedence; otherwise the `ledgerDmk` flag is resolved — a boolean value is
 * used directly (dev-tool override), otherwise the version-gated remote flag is
 * evaluated via `validatedVersionGatedFeatureFlag`. Defaults to `false`. Mirrors
 * the `selectLedgerDmkEnabled` Redux selector.
 *
 * Both the keyring (at engine init, reading persisted state) and the adapter
 * factory (in `useAdapterLifecycle`, reading live state) call this, so they
 * agree as long as the flag is stable across the two reads.
 */
export const isDmkEnabled = (
  flags: Record<string, unknown> | null | undefined = {},
): boolean => {
  if (process.env.LEDGER_FORCE_DMK === 'true') return true;
  if (!flags || !(FeatureFlagNames.ledgerDmk in flags)) return false;
  const raw = flags[FeatureFlagNames.ledgerDmk];
  return typeof raw === 'boolean'
    ? raw
    : (validatedVersionGatedFeatureFlag(raw) ?? false);
};

const state: { dmk: DeviceManagementKit | null } = { dmk: null };

export const getDmk = (): DeviceManagementKit => {
  if (!state.dmk) {
    try {
      state.dmk = new DeviceManagementKitBuilder()
        .addTransport(RNBleTransportFactory)
        .build();
    } catch (error) {
      DevLogger.log('[DMK] Failed to build DeviceManagementKit:', error);
      throw error;
    }
  } else {
    DevLogger.log('[DMK] Returning cached DeviceManagementKit instance');
  }
  return state.dmk;
};

/**
 * Tears down the cached DeviceManagementKit and clears the singleton so the
 * next {@link getDmk} builds a fresh instance.
 *
 * Stops BLE discovery, disconnects any open sessions, then closes the kit.
 * Each step is independently guarded so a failure in one does not skip the
 * others. The cache is cleared only after teardown so a concurrent
 * {@link getDmk} cannot construct a second kit while this instance still owns
 * the transport.
 */
export const resetDmk = async (): Promise<void> => {
  const dmk = state.dmk;
  if (!dmk) {
    return;
  }

  try {
    try {
      await dmk.stopDiscovering();
    } catch (error) {
      DevLogger.log('[DMK] Failed to stop discovering during reset:', error);
    }

    try {
      const sessions = dmk.listConnectedDevices();
      await Promise.allSettled(
        sessions.map((connectedDevice) =>
          dmk.disconnect({ sessionId: connectedDevice.sessionId }),
        ),
      );
    } catch (error) {
      DevLogger.log('[DMK] Failed to disconnect sessions during reset:', error);
    }

    try {
      dmk.close();
    } catch (error) {
      DevLogger.log('[DMK] Failed to close during reset:', error);
    }
  } finally {
    // Clear only after BLE teardown so concurrent getDmk() cannot build a
    // second DeviceManagementKit while this instance still holds the transport.
    if (state.dmk === dmk) {
      state.dmk = null;
    }
  }
};
