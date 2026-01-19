import { RootState } from '../../reducers';
import {
  RampsControllerState,
  RequestStatus,
} from '@metamask/ramps-controller';
import { selectUserRegion, selectUserRegionRequest } from './index';

const createMockState = (
  rampsController: Partial<RampsControllerState> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        RampsController: {
          userRegion: null,
          eligibility: null,
          requests: {},
          ...rampsController,
        },
      },
    },
  }) as unknown as RootState;

describe('RampsController Selectors', () => {
  describe('selectUserRegion', () => {
    it('returns user region from state', () => {
      const state = createMockState({ userRegion: 'US-CA' });

      expect(selectUserRegion(state)).toBe('US-CA');
    });

    it('returns null when user region is null', () => {
      const state = createMockState({ userRegion: null });

      expect(selectUserRegion(state)).toBeNull();
    });
  });

  describe('selectUserRegionRequest', () => {
    it('returns request state with data, isFetching, and error', () => {
      const state = createMockState({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.SUCCESS,
            data: 'US-CA',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result).toEqual({
        data: 'US-CA',
        isFetching: false,
        error: null,
      });
    });

    it('returns isFetching true when request is loading', () => {
      const state = createMockState({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result.isFetching).toBe(true);
    });

    it('returns error when request failed', () => {
      const state = createMockState({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result.error).toBe('Network error');
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectUserRegionRequest(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });
});
