import {
  getDefaultGeolocationControllerState,
  toLocationCode,
  type GeolocationData,
} from '@metamask/geolocation-controller';
import { LAST_GEOLOCATION } from '../../../constants/storage';
import StorageWrapper from '../../../store/storage-wrapper';
import { hasTestOverrides } from '../../../util/test/utils';

/**
 * Session switch for mainland China.
 *
 * Built-in chain RPCs are Infura, and Infura is unreachable from mainland
 * China. `corePlatformRpcFailoverMode: 'forced'` makes the network controller
 * skip Infura hostnames that already have Quicknode failover URLs compiled
 * into the build. The mode follows the geolocation result the app already
 * fetches. Startup does not wait on that request.
 *
 * A country already stored on device is applied before engine init, because
 * network controller init reads the flag while remote-feature-flag init is
 * still in flight. With nothing stored, the controller's own fetch runs in
 * parallel and the flag is set when that response arrives.
 */

const RPC_FAILOVER_MODE_FLAG = 'corePlatformRpcFailoverMode';
const FORCED_RPC_FAILOVER_MODE = 'forced';
const ENABLED_RPC_FAILOVER_MODE = 'enabled';
const MAINLAND_CHINA_COUNTRY_CODE = 'CN';

const COUNTRY_PATTERN = /^[A-Z]{2}$/u;
const REGION_PATTERN = /^[A-Z0-9]{1,3}$/u;
const TIMEZONE_PATTERN = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/u;

const REMOTE_FEATURE_FLAG_CONTROLLER = 'RemoteFeatureFlagController';
const GEOLOCATION_CONTROLLER = 'GeolocationController';

export interface CnInfuraFailoverDependencies {
  readCachedGeolocation: () => Promise<GeolocationData | null>;
  writeCachedGeolocation: (geolocation: GeolocationData) => Promise<void>;
  isTestOverrideRun: boolean;
  now: () => number;
}

export interface CnInfuraFailoverPreparation<T> {
  state: T;
  /** Refresh the cached country after init without blocking startup. */
  refreshInBackground: boolean;
  /**
   * No country is stored. Watch the geolocation fetch the controller already
   * starts, and apply failover when that response arrives.
   */
  watchEagerFetch: boolean;
}

export interface CnInfuraFailoverControllers {
  geolocation: {
    refreshGeolocation: () => Promise<string>;
    state: {
      country: string | null;
      region: string | null;
      timezone: string | null;
      status: string;
    };
  };
  remoteFeatureFlags: {
    setFlagOverride: (flagName: string, value: string) => void;
    removeFlagOverride: (flagName: string) => void;
    state: {
      localOverrides?: Record<string, unknown>;
    };
  };
}

/**
 * Copy a country decision into the background state passed to `Engine.init`.
 *
 * Mainland China forces Quicknode for this session. Any other country clears
 * a forced override this module wrote, and puts back a real server value of
 * `enabled` or `forced` when the raw flags still say so. The geolocation
 * slice is seeded so the controller does not send a second request.
 *
 * @param state - Persisted background state. Not mutated.
 * @param geolocation - Resolved country, region, and timezone.
 * @param now - Epoch milliseconds for `lastFetchedAt`.
 * @returns Background state for engine init.
 */
export function applyGeolocationToBackgroundState<T>(
  state: T,
  geolocation: GeolocationData,
  now: number = Date.now(),
): T {
  if (!isCountryCode(geolocation.country)) {
    return state;
  }

  const source = asRecord(state);
  const remoteSlice = asRecord(source[REMOTE_FEATURE_FLAG_CONTROLLER]);
  const failoverFlags = nextFailoverFlags(remoteSlice, geolocation.country);
  const geolocationState = {
    ...getDefaultGeolocationControllerState(),
    location: toLocationCode(geolocation),
    country: geolocation.country,
    region: geolocation.region,
    timezone: geolocation.timezone,
    status: 'complete' as const,
    lastFetchedAt: now,
    error: null,
  };

  // Leave the flag slice in place when the mode does not change. Cloning it
  // breaks referential equality and rewrites the persisted flags on every launch.
  if (!failoverFlags) {
    return {
      ...source,
      [GEOLOCATION_CONTROLLER]: geolocationState,
    } as T;
  }

  return {
    ...source,
    [REMOTE_FEATURE_FLAG_CONTROLLER]: {
      ...remoteSlice,
      ...failoverFlags,
    },
    [GEOLOCATION_CONTROLLER]: geolocationState,
  } as T;
}

/**
 * Returns new flag maps when this country changes failover mode.
 * Returns null when the existing maps already say the right thing.
 *
 * @param remoteSlice - Current remote-feature-flag controller state.
 * @param country - ISO country code.
 * @returns Replacement flag maps, or null when no flag change is required.
 */
function nextFailoverFlags(
  remoteSlice: Record<string, unknown>,
  country: string,
): {
  localOverrides: Record<string, unknown>;
  remoteFeatureFlags: Record<string, unknown>;
} | null {
  const localOverrides = { ...asRecord(remoteSlice.localOverrides) };
  const remoteFeatureFlags = { ...asRecord(remoteSlice.remoteFeatureFlags) };
  const rawRemoteFeatureFlags = asRecord(remoteSlice.rawRemoteFeatureFlags);
  const localMode = localOverrides[RPC_FAILOVER_MODE_FLAG];
  const remoteMode = remoteFeatureFlags[RPC_FAILOVER_MODE_FLAG];

  if (country === MAINLAND_CHINA_COUNTRY_CODE) {
    if (
      localMode === FORCED_RPC_FAILOVER_MODE &&
      remoteMode === FORCED_RPC_FAILOVER_MODE
    ) {
      return null;
    }
    localOverrides[RPC_FAILOVER_MODE_FLAG] = FORCED_RPC_FAILOVER_MODE;
    remoteFeatureFlags[RPC_FAILOVER_MODE_FLAG] = FORCED_RPC_FAILOVER_MODE;
    return { localOverrides, remoteFeatureFlags };
  }

  if (localMode !== FORCED_RPC_FAILOVER_MODE) {
    return null;
  }

  delete localOverrides[RPC_FAILOVER_MODE_FLAG];
  const rawMode = rawRemoteFeatureFlags[RPC_FAILOVER_MODE_FLAG];
  if (isServerFailoverMode(rawMode)) {
    remoteFeatureFlags[RPC_FAILOVER_MODE_FLAG] = rawMode;
  } else if (remoteMode === FORCED_RPC_FAILOVER_MODE) {
    delete remoteFeatureFlags[RPC_FAILOVER_MODE_FLAG];
  }
  return { localOverrides, remoteFeatureFlags };
}

/**
 * Decide Infura failover from a country already stored on device.
 *
 * A cached country is applied immediately and refreshed in the background.
 * With no cache, state is unchanged and startup does not wait. The
 * controller's own geolocation fetch is watched after init.
 *
 * Test and E2E overrides skip the decision. Fixtures keep their own flags.
 *
 * @param state - Persisted background state.
 * @param dependencies - Storage, replaced in tests.
 * @returns The state to give `Engine.init`, and how to follow geolocation.
 */
export async function prepareCnInfuraFailover<T>(
  state: T,
  dependencies: Partial<CnInfuraFailoverDependencies> = {},
): Promise<CnInfuraFailoverPreparation<T>> {
  const deps = { ...defaultDependencies(), ...dependencies };
  if (deps.isTestOverrideRun) {
    return { state, refreshInBackground: false, watchEagerFetch: false };
  }

  const cached = await deps.readCachedGeolocation();
  if (cached && isCountryCode(cached.country)) {
    return {
      state: applyGeolocationToBackgroundState(state, cached, deps.now()),
      refreshInBackground: true,
      watchEagerFetch: false,
    };
  }

  return { state, refreshInBackground: false, watchEagerFetch: true };
}

/**
 * Re-check the country after startup and keep the session override in step.
 *
 * A failed refresh leaves the decision made at launch in place. Leaving
 * mainland China clears only an override this module set to `forced`.
 *
 * @param controllers - Live geolocation and remote-feature-flag controllers.
 * @param dependencies - Cache writer, replaced in tests.
 */
export async function refreshCnInfuraFailover(
  controllers: CnInfuraFailoverControllers,
  dependencies: Partial<
    Pick<CnInfuraFailoverDependencies, 'writeCachedGeolocation'>
  > = {},
): Promise<void> {
  await controllers.geolocation.refreshGeolocation();
  await syncFailoverToGeolocation(controllers, dependencies);
}

/**
 * Apply failover when the controller's in-flight geolocation fetch completes.
 *
 * Does not start a request. If the fetch already finished, the current state
 * is applied immediately.
 *
 * @param controllers - Live geolocation and remote-feature-flag controllers.
 * @param subscribe - Registers a listener and returns its unsubscribe function.
 * @param dependencies - Cache writer, replaced in tests.
 */
export function watchCnInfuraFailover(
  controllers: CnInfuraFailoverControllers,
  subscribe: (listener: () => void) => () => void,
  dependencies: Partial<
    Pick<CnInfuraFailoverDependencies, 'writeCachedGeolocation'>
  > = {},
): void {
  let settled = false;
  let unsubscribe = (): void => undefined;
  const finish = (): void => {
    if (settled) {
      return;
    }
    const { status } = controllers.geolocation.state;
    if (status !== 'complete' && status !== 'error') {
      return;
    }
    settled = true;
    unsubscribe();
    if (status === 'complete') {
      syncFailoverToGeolocation(controllers, dependencies).catch(() => {
        // A missed write only costs the next cold start a parallel refresh.
      });
    }
  };
  unsubscribe = subscribe(finish);
  finish();
}

/**
 * Copy a completed geolocation result onto the failover flag and the device cache.
 *
 * @param controllers - Live geolocation and remote-feature-flag controllers.
 * @param dependencies - Cache writer, replaced in tests.
 */
async function syncFailoverToGeolocation(
  controllers: CnInfuraFailoverControllers,
  dependencies: Partial<
    Pick<CnInfuraFailoverDependencies, 'writeCachedGeolocation'>
  >,
): Promise<void> {
  const persistGeolocation =
    dependencies.writeCachedGeolocation ??
    defaultDependencies().writeCachedGeolocation;
  const { country, region, timezone, status } = controllers.geolocation.state;
  if (status !== 'complete' || !isCountryCode(country)) {
    return;
  }

  const snapshot: GeolocationData = {
    country,
    region: isRegionCode(region) ? region : null,
    timezone: isTimezone(timezone) ? timezone : null,
  };
  const override =
    controllers.remoteFeatureFlags.state.localOverrides?.[
      RPC_FAILOVER_MODE_FLAG
    ];

  if (country === MAINLAND_CHINA_COUNTRY_CODE) {
    if (override !== FORCED_RPC_FAILOVER_MODE) {
      controllers.remoteFeatureFlags.setFlagOverride(
        RPC_FAILOVER_MODE_FLAG,
        FORCED_RPC_FAILOVER_MODE,
      );
    }
  } else if (override === FORCED_RPC_FAILOVER_MODE) {
    controllers.remoteFeatureFlags.removeFlagOverride(RPC_FAILOVER_MODE_FLAG);
  }

  await persistGeolocation(snapshot);
}

function defaultDependencies(): CnInfuraFailoverDependencies {
  return {
    readCachedGeolocation,
    writeCachedGeolocation,
    isTestOverrideRun: hasTestOverrides,
    now: Date.now,
  };
}

async function readCachedGeolocation(): Promise<GeolocationData | null> {
  try {
    return parseStoredGeolocation(
      await StorageWrapper.getItem(LAST_GEOLOCATION),
    );
  } catch {
    // Missing storage is a cache miss. The caller falls through to one fetch.
    return null;
  }
}

async function writeCachedGeolocation(
  geolocation: GeolocationData,
): Promise<void> {
  if (!isCountryCode(geolocation.country)) {
    return;
  }
  try {
    await StorageWrapper.setItem(
      LAST_GEOLOCATION,
      JSON.stringify({
        country: geolocation.country,
        region: geolocation.region,
        timezone: geolocation.timezone,
      }),
    );
  } catch {
    // A missed write only costs the next cold start one geolocation wait.
  }
}

function parseStoredGeolocation(raw: string | null): GeolocationData | null {
  if (!raw) {
    return null;
  }
  if (isCountryCode(raw)) {
    return { country: raw, region: null, timezone: null };
  }
  try {
    return parseGeolocationBody(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseGeolocationBody(body: unknown): GeolocationData | null {
  const record = asRecord(body);
  if (Array.isArray(body) || Object.keys(record).length === 0) {
    return null;
  }
  const country = readValidatedField(record, 'country', COUNTRY_PATTERN);
  if (!country) {
    return null;
  }
  return {
    country,
    region: readValidatedField(record, 'region', REGION_PATTERN),
    timezone: readValidatedField(record, 'timezone', TIMEZONE_PATTERN),
  };
}

function readValidatedField(
  record: Record<string, unknown>,
  field: string,
  pattern: RegExp,
): string | null {
  const value = record[field];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return pattern.test(trimmed) ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function isCountryCode(value: string | null | undefined): value is string {
  return typeof value === 'string' && COUNTRY_PATTERN.test(value);
}

function isRegionCode(value: string | null | undefined): value is string {
  return typeof value === 'string' && REGION_PATTERN.test(value);
}

function isTimezone(value: string | null | undefined): value is string {
  return typeof value === 'string' && TIMEZONE_PATTERN.test(value);
}

function isServerFailoverMode(
  value: unknown,
): value is typeof ENABLED_RPC_FAILOVER_MODE | typeof FORCED_RPC_FAILOVER_MODE {
  return (
    value === ENABLED_RPC_FAILOVER_MODE || value === FORCED_RPC_FAILOVER_MODE
  );
}
