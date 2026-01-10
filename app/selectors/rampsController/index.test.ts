import { RootState } from '../../reducers';
import {
  RampsControllerState,
  RequestStatus,
} from '@metamask/ramps-controller';
import { selectGeolocation, selectGeolocationRequest } from './index';

const createMockState = (
  rampsController: Partial<RampsControllerState> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        RampsController: {
          geolocation: null,
          requests: {},
          ...rampsController,
        },
      },
    },
  }) as unknown as RootState;

describe('RampsController Selectors', () => {
  describe('selectGeolocation', () => {
    it('returns geolocation from state', () => {
      const state = createMockState({ geolocation: 'US-CA' });

      expect(selectGeolocation(state)).toBe('US-CA');
    });

    it('returns null when geolocation is null', () => {
      const state = createMockState({ geolocation: null });

      expect(selectGeolocation(state)).toBeNull();
    });
  });

  describe('selectGeolocationRequest', () => {
    it('returns data when request is successful', () => {
      const state = createMockState({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.SUCCESS,
            data: 'US-CA',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectGeolocationRequest(state);

      expect(result.data).toBe('US-CA');
    });

    it('returns isFetching false when request is successful', () => {
      const state = createMockState({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.SUCCESS,
            data: 'US-CA',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectGeolocationRequest(state);

      expect(result.isFetching).toBe(false);
    });

    it('returns error null when request is successful', () => {
      const state = createMockState({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.SUCCESS,
            data: 'US-CA',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectGeolocationRequest(state);

      expect(result.error).toBe(null);
    });

    it('returns isFetching true when request is loading', () => {
      const state = createMockState({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectGeolocationRequest(state);

      expect(result.isFetching).toBe(true);
    });

    it('returns error when request failed', () => {
      const state = createMockState({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectGeolocationRequest(state);

      expect(result.error).toBe('Network error');
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectGeolocationRequest(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });
});
