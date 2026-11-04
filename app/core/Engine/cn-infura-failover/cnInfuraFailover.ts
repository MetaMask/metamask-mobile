import {
  getDefaultGeolocationControllerState,
  toLocationCode,
  type GeolocationData,
} from '@metamask/geolocation-controller';
import { LAST_GEOLOCATION } from '../../../constants/storage';
import { ApiEnv, getApiEnv } from '../../apiEnv';
import StorageWrapper from '../../../store/storage-wrapper';
import { hasTestOverrides } from '../../../util/test/utils';

/**
 * Session switch for mainland China.
 *
 * Built-in chain RPCs are Infura, and Infura is unreachable from mainland
 * China. `corePlatformRpcFailoverMode: 'forced'` makes the network controller
 * skip Infura hostnames that already have Quicknode failover URLs compiled
 * into the build. The mode is chosen from the geolocation request the app
 * already makes. No probe is added for anyone else.
 *
 * The flag has to be present in the initial controller state. Network
 * controller init reads it while remote-feature-flag init is still in flight,
 * so a later override alone can lose the race and still dial Infura.
 */

const RPC_FAILOVER_MODE_FLAG = 'corePlatformRpcFailoverMode';
const FORCED_RPC_FAILOVER_MODE = 'forced';
const ENABLED_RPC_FAILOVER_MODE = 'enabled';
const MAINLAND_CHINA_COUNTRY_CODE = 'CN';

/** Safety cap so a stuck geolocation request cannot hold launch open. */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 5000;

const COUNTRY_PATTERN = /^[A-Z]{2}$/u;
const REGION_PATTERN = /^[A-Z0-9]{1,3}$/u;
const TIMEZONE_PATTERN = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/u;

const REMOTE_FEATURE_FLAG_CONTROLLER = 'RemoteFeatureFlagController';
const GEOLOCATION_CONTROLLER = 'GeolocationController';

export interface CnInfuraFailoverDependencies {
  fetchImpl: typeof fetch;
  readCachedGeolocation: () => Promise<GeolocationData | null>;
  writeCachedGeolocation: (geolocation: GeolocationData) => Promise<void>;
  isTestOverrideRun: boolean;
  now: () => number;
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
 * Same host the GeolocationApiService uses. Production stays on the
 * unprefixed API; every other cluster uses the dev prefix, matching
 * `geolocationApiServiceInit`.
 *
 * @returns The geolocation endpoint for this build.
 */
export function geolocationEndpointUrl(): string {
  const prefix = getApiEnv() === ApiEnv.Prod ? '' : 'dev-';
  return `https://geolocation.${prefix}api.cx.metamask.io/v2/geolocation`;
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
 * Decide Infura failover before the engine starts.
 *
 * A cached country is applied immediately and refreshed in the background.
 * With no cache, this waits on the one geolocation request the controller
 * would have sent itself, then skips that eager fetch. A failed lookup leaves
 * state alone so startup is unchanged.
 *
 * Test and E2E overrides skip the decision. Fixtures keep their own flags.
 *
 * @param state - Persisted background state.
 * @param dependencies - Storage and fetch, replaced in tests.
 * @returns The state to give `Engine.init`, and whether to refresh after init.
 */
export async function prepareCnInfuraFailover<T>(
  state: T,
  dependencies: Partial<CnInfuraFailoverDependencies> = {},
): Promise<{ state: T; refreshInBackground: boolean }> {
  const deps = { ...defaultDependencies(), ...dependencies };
  if (deps.isTestOverrideRun) {
    return { state, refreshInBackground: false };
  }

  const cached = await deps.readCachedGeolocation();
  if (cached && isCountryCode(cached.country)) {
    return {
      state: applyGeolocationToBackgroundState(state, cached, deps.now()),
      refreshInBackground: true,
    };
  }

  const snapshot = await fetchGeolocationSnapshot(deps.fetchImpl);
  if (!snapshot) {
    return { state, refreshInBackground: false };
  }

  await deps.writeCachedGeolocation(snapshot);
  return {
    state: applyGeolocationToBackgroundState(state, snapshot, deps.now()),
    refreshInBackground: false,
  };
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
  const persistGeolocation =
    dependencies.writeCachedGeolocation ??
    defaultDependencies().writeCachedGeolocation;

  await controllers.geolocation.refreshGeolocation();
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

async function fetchGeolocationSnapshot(
  fetchImpl: typeof fetch,
): Promise<GeolocationData | null> {
  try {
    const response = await fetchImpl(geolocationEndpointUrl(), {
      signal: AbortSignal.timeout(GEOLOCATION_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    return parseGeolocationBody(await response.json());
  } catch {
    // A timed-out or unreachable lookup must not block launch. Failover stays
    // unchanged this session; the controller's own fetch still runs.
    return null;
  }
}

function defaultDependencies(): CnInfuraFailoverDependencies {
  return {
    fetchImpl: globalThis.fetch.bind(globalThis),
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
