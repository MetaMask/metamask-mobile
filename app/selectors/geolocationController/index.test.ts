import {
  selectGeolocationControllerState,
  selectGeolocationLocation,
  selectGeolocationStatus,
  selectIsCopyTradeAllowed,
  selectIsUserInAsia,
} from '.';
import type { RootState } from '../../reducers';

const buildState = (
  geolocationController: Record<string, unknown> | undefined,
): {
  engine?: {
    backgroundState?: { GeolocationController?: Record<string, unknown> };
  };
} => ({
  engine: {
    backgroundState: {
      GeolocationController: geolocationController,
    },
  },
});

describe('geolocationController selectors', () => {
  describe('selectGeolocationControllerState', () => {
    it('returns the full GeolocationController slice', () => {
      const slice = { location: 'AU', status: 'complete' };
      const state = buildState(slice);
      expect(
        selectGeolocationControllerState(state as unknown as RootState),
      ).toStrictEqual(slice);
    });

    it('returns undefined when engine state is missing', () => {
      expect(selectGeolocationControllerState({} as RootState)).toBeUndefined();
    });
  });

  describe('selectGeolocationLocation', () => {
    it('returns the location string when present', () => {
      const state = buildState({ location: 'US', status: 'complete' });
      expect(selectGeolocationLocation(state as unknown as RootState)).toBe(
        'US',
      );
    });

    it('returns undefined when location is not set', () => {
      const state = buildState({ status: 'complete' });
      expect(
        selectGeolocationLocation(state as unknown as RootState),
      ).toBeUndefined();
    });

    it('returns undefined when GeolocationController is absent', () => {
      expect(selectGeolocationLocation({} as RootState)).toBeUndefined();
    });
  });

  describe('selectGeolocationStatus', () => {
    it('returns the status string when present', () => {
      const state = buildState({ location: 'AU', status: 'complete' });
      expect(selectGeolocationStatus(state as unknown as RootState)).toBe(
        'complete',
      );
    });

    it('returns "loading" status correctly', () => {
      const state = buildState({ status: 'loading' });
      expect(selectGeolocationStatus(state as unknown as RootState)).toBe(
        'loading',
      );
    });

    it('returns "idle" status correctly', () => {
      const state = buildState({ status: 'idle' });
      expect(selectGeolocationStatus(state as unknown as RootState)).toBe(
        'idle',
      );
    });

    it('returns undefined when status is not set', () => {
      const state = buildState({ location: 'AU' });
      expect(
        selectGeolocationStatus(state as unknown as RootState),
      ).toBeUndefined();
    });

    it('returns undefined when GeolocationController is absent', () => {
      expect(selectGeolocationStatus({} as RootState)).toBeUndefined();
    });
  });

  describe('selectIsUserInAsia', () => {
    beforeEach(() => {
      selectIsUserInAsia.resetRecomputations();
    });

    it.each(['JP', 'KR', 'TW', 'CN', 'HK'])('returns true for %s', (code) => {
      const state = buildState({ location: code, status: 'complete' });
      expect(selectIsUserInAsia(state as unknown as RootState)).toBe(true);
    });

    it('returns true for country-region code (e.g. CN-BJ)', () => {
      const state = buildState({ location: 'CN-BJ', status: 'complete' });
      expect(selectIsUserInAsia(state as unknown as RootState)).toBe(true);
    });

    it.each(['US', 'GB', 'FR', 'AU', 'BR'])(
      'returns false for non-Asia country %s',
      (code) => {
        const state = buildState({ location: code, status: 'complete' });
        expect(selectIsUserInAsia(state as unknown as RootState)).toBe(false);
      },
    );

    it('returns false when location is UNKNOWN', () => {
      const state = buildState({ location: 'UNKNOWN', status: 'complete' });
      expect(selectIsUserInAsia(state as unknown as RootState)).toBe(false);
    });

    it('returns false when location is undefined', () => {
      const state = buildState({ status: 'complete' });
      expect(selectIsUserInAsia(state as unknown as RootState)).toBe(false);
    });

    it('returns false when GeolocationController is absent', () => {
      expect(selectIsUserInAsia({} as RootState)).toBe(false);
    });
  });

  describe('selectIsCopyTradeAllowed', () => {
    it('returns true for a completed non-UK location', () => {
      const state = buildState({ location: 'FR', status: 'complete' });

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        true,
      );
    });

    it('returns false for a completed UK location', () => {
      const state = buildState({ location: 'GB', status: 'complete' });

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        false,
      );
    });

    it('returns false while geolocation is loading', () => {
      const state = buildState({ location: 'FR', status: 'loading' });

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        false,
      );
    });
  });

  describe('selectIsCopyTradeAllowed with socialCopyTradeGeoBlockedCountries', () => {
    const buildStateWithFlag = (
      geolocationController: Record<string, unknown>,
      blockedRegions: unknown,
    ): {
      engine: {
        backgroundState: Record<string, unknown>;
      };
    } => ({
      engine: {
        backgroundState: {
          GeolocationController: geolocationController,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              socialCopyTradeGeoBlockedCountries: { blockedRegions },
            },
            cacheTimestamp: 0,
          },
        },
      },
    });

    it('returns false for a region under a country in the remote list', () => {
      const state = buildStateWithFlag(
        { location: 'US-CA', status: 'complete' },
        ['US', 'CA-ON'],
      );

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        false,
      );
    });

    it('returns false for a region in the remote list', () => {
      const state = buildStateWithFlag(
        { location: 'CA-ON', status: 'complete' },
        ['US', 'CA-ON'],
      );

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        false,
      );
    });

    it('returns true for a location not in the remote list', () => {
      const state = buildStateWithFlag({ location: 'GB', status: 'complete' }, [
        'US',
        'CA-ON',
      ]);

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        true,
      );
    });

    it('returns true for the UK when the remote list is empty', () => {
      const state = buildStateWithFlag(
        { location: 'GB', status: 'complete' },
        [],
      );

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        true,
      );
    });

    it('returns false for the UK when the remote flag is malformed', () => {
      const state = buildStateWithFlag(
        { location: 'GB', status: 'complete' },
        'US',
      );

      expect(selectIsCopyTradeAllowed(state as unknown as RootState)).toBe(
        false,
      );
    });
  });
});
