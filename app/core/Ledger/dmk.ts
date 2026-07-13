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
 * The keyring reads this once at engine init and latches the result via
 * `setDmkEnabled`; the adapter factory reads the latch (`getDmkEnabled`), so
 * both sides are guaranteed to agree for the whole app session.
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

const state: {
  dmk: DeviceManagementKit | null;
  /**
   * DMK flag value resolved once at engine init (see `setDmkEnabled`).
   * `null` until `initializeWallet` runs.
   */
  dmkEnabled: boolean | null;
} = { dmk: null, dmkEnabled: null };

/**
 * Latch the resolved DMK flag at engine init.
 *
 * Why: the keyring builders are fixed for the app session at engine init,
 * but the adapter factory used to re-evaluate the flag from *live* Redux
 * state on every adapter creation. The two readers could disagree (remote
 * flag refetch mid-session, or `selectRemoteFeatureFlags` returning `{}`
 * when basic functionality is disabled while the init-time read is ungated),
 * silently pairing a DMK adapter with a legacy bridge (or vice versa) —
 * both combinations break Ledger entirely. Latching the init-time value
 * makes the adapter choice atomically consistent with the keyring choice;
 * a flag change takes effect on the next app launch for BOTH sides.
 */
export const setDmkEnabled = (enabled: boolean): void => {
  state.dmkEnabled = enabled;
};

/**
 * The DMK flag as the keyring saw it at engine init. Falls back to a live
 * evaluation only if the latch was never set (defensive: engine init always
 * runs before any adapter is created).
 */
export const getDmkEnabled = (
  fallbackFlags?: Record<string, unknown> | null,
): boolean => state.dmkEnabled ?? isDmkEnabled(fallbackFlags);

export const getDmk = (): DeviceManagementKit => {
  if (!state.dmk) {
    DevLogger.log('[DMK] Building DeviceManagementKit...');
    try {
      state.dmk = new DeviceManagementKitBuilder()
        .addTransport(RNBleTransportFactory)
        .build();
      DevLogger.log('[DMK] DeviceManagementKit built successfully');
    } catch (error) {
      DevLogger.log('[DMK] Failed to build DeviceManagementKit:', error);
      throw error;
    }
  } else {
    DevLogger.log('[DMK] Returning cached DeviceManagementKit instance');
  }
  return state.dmk;
};

export const resetDmk = (): void => {
  DevLogger.log('[DMK] Resetting DeviceManagementKit instance');
  // Close before dropping the reference: DMK owns a native BleManager and a
  // BLE-state subscription. Nulling without close() leaks that stack, and the
  // next getDmk() would run a second live BLE manager alongside the orphan.
  try {
    state.dmk?.close();
  } catch (error) {
    DevLogger.log('[DMK] Error closing DeviceManagementKit:', error);
  }
  state.dmk = null;
};
