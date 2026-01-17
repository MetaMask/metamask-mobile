import { RootState } from '../../reducers';
import {
  RampsControllerState,
  RequestStatus,
  UserRegion,
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
          requests: {},
          ...rampsController,
        },
      },
    },
  }) as unknown as RootState;

const mockUserRegion: UserRegion = {
  country: {
    isoCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: true,
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

describe('RampsController Selectors', () => {
  describe('selectUserRegion', () => {
    it('returns user region from state', () => {
      const state = createMockState({ userRegion: mockUserRegion });

      expect(selectUserRegion(state)).toEqual(mockUserRegion);
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
            data: mockUserRegion,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result).toEqual({
        data: mockUserRegion,
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
