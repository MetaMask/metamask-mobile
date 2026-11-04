import type { GeolocationData } from '@metamask/geolocation-controller';
import { LAST_GEOLOCATION } from '../../../constants/storage';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  applyGeolocationToBackgroundState,
  prepareCnInfuraFailover,
  refreshCnInfuraFailover,
  watchCnInfuraFailover,
  type CnInfuraFailoverControllers,
} from './cnInfuraFailover';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const FORCED = 'forced';
const FLAG = 'corePlatformRpcFailoverMode';

interface BackgroundState {
  PreferencesController?: { foo: number };
  RemoteFeatureFlagController?: {
    localOverrides?: Record<string, unknown>;
    remoteFeatureFlags?: Record<string, unknown>;
    rawRemoteFeatureFlags?: Record<string, unknown>;
    cacheTimestamp?: number;
  };
  GeolocationController?: {
    location: string;
    country: string | null;
    region: string | null;
    timezone: string | null;
    status: string;
    lastFetchedAt: number | null;
    error: string | null;
  };
}

function backgroundState(
  overrides: {
    localOverrides?: Record<string, unknown>;
    remoteFeatureFlags?: Record<string, unknown>;
    rawRemoteFeatureFlags?: Record<string, unknown>;
  } = {},
): BackgroundState {
  return {
    PreferencesController: { foo: 1 },
    RemoteFeatureFlagController: {
      cacheTimestamp: 5,
      localOverrides: {
        someOtherFlag: true,
        ...overrides.localOverrides,
      },
      remoteFeatureFlags: {
        someOtherFlag: true,
        ...overrides.remoteFeatureFlags,
      },
      rawRemoteFeatureFlags: { ...overrides.rawRemoteFeatureFlags },
    },
  };
}

function china(): GeolocationData {
  return { country: 'CN', region: 'SC', timezone: 'Asia/Shanghai' };
}

describe('applyGeolocationToBackgroundState', () => {
  it('forces Quicknode and seeds geolocation when the country is CN', () => {
    const state = backgroundState();

    const next = applyGeolocationToBackgroundState(state, china(), 20);

    expect(next.RemoteFeatureFlagController?.localOverrides).toEqual({
      someOtherFlag: true,
      [FLAG]: FORCED,
    });
    expect(next.RemoteFeatureFlagController?.remoteFeatureFlags).toEqual({
      someOtherFlag: true,
      [FLAG]: FORCED,
    });
    expect(next.RemoteFeatureFlagController?.cacheTimestamp).toBe(5);
    expect(next.GeolocationController).toMatchObject({
      location: 'CN',
      country: 'CN',
      region: 'SC',
      timezone: 'Asia/Shanghai',
      status: 'complete',
      lastFetchedAt: 20,
      error: null,
    });
    expect(next.PreferencesController).toEqual({ foo: 1 });
    expect(state.RemoteFeatureFlagController?.localOverrides).toEqual({
      someOtherFlag: true,
    });
  });

  it('keeps the feature-flag controller state for a country other than CN', () => {
    const state = backgroundState();

    const next = applyGeolocationToBackgroundState(
      state,
      { country: 'FR', region: 'IDF', timezone: 'Europe/Paris' },
      20,
    );

    expect(next.RemoteFeatureFlagController).toBe(
      state.RemoteFeatureFlagController,
    );
  });

  it('keeps the feature-flag controller state when CN is already forced', () => {
    const state = backgroundState({
      localOverrides: { [FLAG]: FORCED },
      remoteFeatureFlags: { [FLAG]: FORCED },
    });

    const next = applyGeolocationToBackgroundState(state, china(), 20);

    expect(next.RemoteFeatureFlagController).toBe(
      state.RemoteFeatureFlagController,
    );
    expect(next.GeolocationController?.country).toBe('CN');
  });

  it('keeps the country code as the location outside the US and Canada', () => {
    const next = applyGeolocationToBackgroundState(
      backgroundState(),
      { country: 'FR', region: 'IDF', timezone: 'Europe/Paris' },
      20,
    );

    expect(next.GeolocationController?.location).toBe('FR');
    expect(next.RemoteFeatureFlagController?.remoteFeatureFlags?.[FLAG]).toBe(
      undefined,
    );
  });

  it('appends the region for a US location', () => {
    const next = applyGeolocationToBackgroundState(
      backgroundState(),
      { country: 'US', region: 'NY', timezone: 'America/New_York' },
      20,
    );

    expect(next.GeolocationController?.location).toBe('US-NY');
  });

  it('returns the same state when the country is missing', () => {
    const state = backgroundState();

    const next = applyGeolocationToBackgroundState(
      state,
      { country: null, region: null, timezone: null },
      20,
    );

    expect(next).toBe(state);
  });

  it('clears a forced override and restores a server enabled mode', () => {
    const state = backgroundState({
      localOverrides: { [FLAG]: FORCED },
      remoteFeatureFlags: { [FLAG]: FORCED },
      rawRemoteFeatureFlags: { [FLAG]: 'enabled' },
    });

    const next = applyGeolocationToBackgroundState(
      state,
      { country: 'DE', region: null, timezone: 'Europe/Berlin' },
      20,
    );

    expect(next.RemoteFeatureFlagController?.localOverrides).toEqual({
      someOtherFlag: true,
    });
    expect(next.RemoteFeatureFlagController?.remoteFeatureFlags).toEqual({
      someOtherFlag: true,
      [FLAG]: 'enabled',
    });
  });

  it('keeps a server forced mode for a country other than CN', () => {
    const state = backgroundState({
      localOverrides: { [FLAG]: FORCED },
      remoteFeatureFlags: { [FLAG]: FORCED },
      rawRemoteFeatureFlags: { [FLAG]: FORCED },
    });

    const next = applyGeolocationToBackgroundState(
      state,
      { country: 'DE', region: null, timezone: null },
      20,
    );

    expect(next.RemoteFeatureFlagController?.localOverrides?.[FLAG]).toBe(
      undefined,
    );
    expect(next.RemoteFeatureFlagController?.remoteFeatureFlags?.[FLAG]).toBe(
      FORCED,
    );
  });

  it('drops a forced mode that the server did not set', () => {
    const state = backgroundState({
      localOverrides: { [FLAG]: FORCED },
      remoteFeatureFlags: { [FLAG]: FORCED },
    });

    const next = applyGeolocationToBackgroundState(
      state,
      { country: 'JP', region: null, timezone: null },
      20,
    );

    expect(next.RemoteFeatureFlagController?.localOverrides?.[FLAG]).toBe(
      undefined,
    );
    expect(next.RemoteFeatureFlagController?.remoteFeatureFlags?.[FLAG]).toBe(
      undefined,
    );
  });

  it('leaves an enabled override in place outside CN', () => {
    const state = backgroundState({
      localOverrides: { [FLAG]: 'enabled' },
      remoteFeatureFlags: { [FLAG]: 'enabled' },
    });

    const next = applyGeolocationToBackgroundState(
      state,
      { country: 'JP', region: null, timezone: null },
      20,
    );

    expect(next.RemoteFeatureFlagController?.localOverrides?.[FLAG]).toBe(
      'enabled',
    );
    expect(next.RemoteFeatureFlagController?.remoteFeatureFlags?.[FLAG]).toBe(
      'enabled',
    );
  });
});

describe('prepareCnInfuraFailover', () => {
  it('returns the original state when test overrides are on', async () => {
    const state = backgroundState();
    const prepared = await prepareCnInfuraFailover(state, {
      readCachedGeolocation: async () => china(),
      isTestOverrideRun: true,
    });

    expect(prepared).toEqual({
      state,
      refreshInBackground: false,
      watchEagerFetch: false,
    });
  });

  it('applies a cached country without requesting geolocation', async () => {
    const prepared = await prepareCnInfuraFailover(backgroundState(), {
      readCachedGeolocation: async () => china(),
      isTestOverrideRun: false,
      now: () => 30,
    });

    expect(prepared.refreshInBackground).toBe(true);
    expect(
      prepared.state.RemoteFeatureFlagController?.remoteFeatureFlags?.[FLAG],
    ).toBe(FORCED);
    expect(prepared.state.GeolocationController?.region).toBe('SC');
    expect(prepared.state.GeolocationController?.lastFetchedAt).toBe(30);
  });

  it('does not fetch geolocation when nothing is cached', async () => {
    const state = backgroundState();
    const writeCachedGeolocation = jest.fn(async () => undefined);

    const prepared = await prepareCnInfuraFailover(state, {
      readCachedGeolocation: async () => null,
      writeCachedGeolocation,
      isTestOverrideRun: false,
    });

    expect(writeCachedGeolocation).not.toHaveBeenCalled();
    expect(prepared).toEqual({
      state,
      refreshInBackground: false,
      watchEagerFetch: true,
    });
  });

  it('leaves startup state unchanged when nothing is cached', async () => {
    const state = backgroundState();
    const writeCachedGeolocation = jest.fn();

    const prepared = await prepareCnInfuraFailover(state, {
      readCachedGeolocation: async () => null,
      writeCachedGeolocation,
      isTestOverrideRun: false,
    });

    expect(prepared).toEqual({
      state,
      refreshInBackground: false,
      watchEagerFetch: true,
    });
    expect(writeCachedGeolocation).not.toHaveBeenCalled();
  });

  it('reads a stored geolocation without requesting it again', async () => {
    const getItem = jest.mocked(StorageWrapper.getItem);
    getItem.mockResolvedValueOnce(
      JSON.stringify({
        country: 'US',
        region: 'NY',
        timezone: 'America/New_York',
      }),
    );

    const cached = await prepareCnInfuraFailover(backgroundState(), {
      isTestOverrideRun: false,
      now: () => 7,
    });

    expect(getItem).toHaveBeenCalledWith(LAST_GEOLOCATION);
    expect(cached.state.GeolocationController?.location).toBe('US-NY');
    expect(cached.refreshInBackground).toBe(true);
  });

  it('reads a stored country code', async () => {
    jest.mocked(StorageWrapper.getItem).mockResolvedValueOnce('CN');

    const prepared = await prepareCnInfuraFailover(backgroundState(), {
      isTestOverrideRun: false,
      now: () => 8,
    });

    expect(prepared.state.GeolocationController?.location).toBe('CN');
    expect(prepared.refreshInBackground).toBe(true);
  });

  it('does not write the cache when nothing is stored', async () => {
    const setItem = jest.mocked(StorageWrapper.setItem);
    jest.mocked(StorageWrapper.getItem).mockResolvedValueOnce(null);

    await prepareCnInfuraFailover(backgroundState(), {
      isTestOverrideRun: false,
    });

    expect(setItem).not.toHaveBeenCalled();
  });

  it('treats a country-only cache entry as a hit', async () => {
    const prepared = await prepareCnInfuraFailover(backgroundState(), {
      readCachedGeolocation: async () => ({
        country: 'CN',
        region: null,
        timezone: null,
      }),
      isTestOverrideRun: false,
      now: () => 1,
    });

    expect(prepared.state.GeolocationController?.location).toBe('CN');
    expect(prepared.refreshInBackground).toBe(true);
    expect(prepared.watchEagerFetch).toBe(false);
  });
});

describe('refreshCnInfuraFailover', () => {
  function controllersFor(options: {
    country: string | null;
    status?: string;
    override?: string;
    region?: string | null;
  }): {
    controllers: CnInfuraFailoverControllers;
    setFlagOverride: jest.Mock;
    removeFlagOverride: jest.Mock;
  } {
    const setFlagOverride = jest.fn();
    const removeFlagOverride = jest.fn();
    const geolocationState = {
      country: options.country,
      region: options.region ?? null,
      timezone: 'Asia/Shanghai',
      status: options.status ?? 'complete',
    };
    return {
      setFlagOverride,
      removeFlagOverride,
      controllers: {
        geolocation: {
          refreshGeolocation: jest.fn(async () => options.country ?? 'UNKNOWN'),
          state: geolocationState,
        },
        remoteFeatureFlags: {
          setFlagOverride,
          removeFlagOverride,
          state: {
            localOverrides:
              options.override === undefined
                ? {}
                : { [FLAG]: options.override },
          },
        },
      },
    };
  }

  it('sets the forced override when the refreshed country is CN', async () => {
    const writeCachedGeolocation = jest.fn(async () => undefined);
    const { controllers, setFlagOverride, removeFlagOverride } = controllersFor(
      { country: 'CN', region: 'SC' },
    );

    await refreshCnInfuraFailover(controllers, { writeCachedGeolocation });

    expect(setFlagOverride).toHaveBeenCalledWith(FLAG, FORCED);
    expect(removeFlagOverride).not.toHaveBeenCalled();
    expect(writeCachedGeolocation).toHaveBeenCalledWith({
      country: 'CN',
      region: 'SC',
      timezone: 'Asia/Shanghai',
    });
  });

  it('does not rewrite the override when it is already forced', async () => {
    const { controllers, setFlagOverride } = controllersFor({
      country: 'CN',
      override: FORCED,
    });

    await refreshCnInfuraFailover(controllers, {
      writeCachedGeolocation: async () => undefined,
    });

    expect(setFlagOverride).not.toHaveBeenCalled();
  });

  it('clears a forced override when the refreshed country is not CN', async () => {
    const { controllers, setFlagOverride, removeFlagOverride } = controllersFor(
      { country: 'HK', override: FORCED },
    );

    await refreshCnInfuraFailover(controllers, {
      writeCachedGeolocation: async () => undefined,
    });

    expect(removeFlagOverride).toHaveBeenCalledWith(FLAG);
    expect(setFlagOverride).not.toHaveBeenCalled();
  });

  it('keeps the launch decision when the refresh does not complete', async () => {
    const writeCachedGeolocation = jest.fn();
    const setFlagOverride = jest.fn();
    const removeFlagOverride = jest.fn();
    const geolocationState = {
      country: 'CN',
      region: 'SC',
      timezone: 'Asia/Shanghai',
      status: 'complete',
    };

    await refreshCnInfuraFailover(
      {
        geolocation: {
          refreshGeolocation: async () => {
            geolocationState.status = 'error';
            return 'CN';
          },
          state: geolocationState,
        },
        remoteFeatureFlags: {
          setFlagOverride,
          removeFlagOverride,
          state: { localOverrides: { [FLAG]: FORCED } },
        },
      },
      { writeCachedGeolocation },
    );

    expect(setFlagOverride).not.toHaveBeenCalled();
    expect(removeFlagOverride).not.toHaveBeenCalled();
    expect(writeCachedGeolocation).not.toHaveBeenCalled();
  });

  it('drops a timezone that fails validation before storing it', async () => {
    const writeCachedGeolocation = jest.fn(async () => undefined);
    const { controllers } = controllersFor({
      country: 'JP',
      region: '13',
    });
    controllers.geolocation.state.timezone = 'not a zone';

    await refreshCnInfuraFailover(controllers, { writeCachedGeolocation });

    expect(writeCachedGeolocation).toHaveBeenCalledWith({
      country: 'JP',
      region: '13',
      timezone: null,
    });
  });
});

describe('watchCnInfuraFailover', () => {
  it('applies a completed fetch without waiting for another request', async () => {
    const writeCachedGeolocation = jest.fn(async () => undefined);
    const setFlagOverride = jest.fn();
    const subscribe = jest.fn(() => jest.fn());

    watchCnInfuraFailover(
      {
        geolocation: {
          refreshGeolocation: jest.fn(),
          state: {
            country: 'CN',
            region: 'SC',
            timezone: 'Asia/Shanghai',
            status: 'complete',
          },
        },
        remoteFeatureFlags: {
          setFlagOverride,
          removeFlagOverride: jest.fn(),
          state: { localOverrides: {} },
        },
      },
      subscribe,
      { writeCachedGeolocation },
    );

    await Promise.resolve();

    expect(setFlagOverride).toHaveBeenCalledWith(FLAG, FORCED);
    expect(writeCachedGeolocation).toHaveBeenCalledWith({
      country: 'CN',
      region: 'SC',
      timezone: 'Asia/Shanghai',
    });
  });

  it('sets forced mode when the in-flight fetch later returns CN', async () => {
    const writeCachedGeolocation = jest.fn(async () => undefined);
    const setFlagOverride = jest.fn();
    const state = {
      country: null as string | null,
      region: null as string | null,
      timezone: null as string | null,
      status: 'loading',
    };
    let listener: (() => void) | undefined;
    const unsubscribe = jest.fn();

    watchCnInfuraFailover(
      {
        geolocation: {
          refreshGeolocation: jest.fn(),
          state,
        },
        remoteFeatureFlags: {
          setFlagOverride,
          removeFlagOverride: jest.fn(),
          state: { localOverrides: {} },
        },
      },
      (nextListener) => {
        listener = nextListener;
        return unsubscribe;
      },
      { writeCachedGeolocation },
    );

    expect(setFlagOverride).not.toHaveBeenCalled();

    state.country = 'CN';
    state.region = 'SC';
    state.timezone = 'Asia/Shanghai';
    state.status = 'complete';
    listener?.();
    await Promise.resolve();

    expect(setFlagOverride).toHaveBeenCalledWith(FLAG, FORCED);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not change failover when the fetch fails', () => {
    const setFlagOverride = jest.fn();
    const state = {
      country: null as string | null,
      region: null,
      timezone: null,
      status: 'loading',
    };
    let listener: (() => void) | undefined;

    watchCnInfuraFailover(
      {
        geolocation: {
          refreshGeolocation: jest.fn(),
          state,
        },
        remoteFeatureFlags: {
          setFlagOverride,
          removeFlagOverride: jest.fn(),
          state: { localOverrides: {} },
        },
      },
      (nextListener) => {
        listener = nextListener;
        return jest.fn();
      },
    );

    state.status = 'error';
    listener?.();

    expect(setFlagOverride).not.toHaveBeenCalled();
  });
});
