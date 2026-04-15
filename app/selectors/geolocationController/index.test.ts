import {
  selectGeolocationControllerState,
  selectGeolocationLocation,
  selectGeolocationStatus,
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
});
