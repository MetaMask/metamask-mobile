import { RootState } from '../../reducers';
import {
  RampsControllerState,
  RequestStatus,
} from '@metamask/ramps-controller';
import {
  selectRampsControllerState,
  selectGeolocation,
  selectRequestsCache,
  makeSelectRequestState,
  makeSelectRequestData,
  makeSelectRequestIsLoading,
  makeSelectRequestError,
  makeSelectRequestStatus,
} from './index';

describe('RampsController Selectors', () => {
  describe('selectRampsControllerState', () => {
    it('returns RampsController state from engine', () => {
      const mockRampsControllerState: RampsControllerState = {
        geolocation: 'US-CA',
        requests: {},
      };

      const mockState = {
        engine: {
          backgroundState: {
            RampsController: mockRampsControllerState,
          },
        },
      } as unknown as RootState;

      expect(selectRampsControllerState(mockState)).toEqual(
        mockRampsControllerState,
      );
    });
  });

  describe('selectGeolocation', () => {
    it('returns geolocation from RampsController state', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: 'US-NY',
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      expect(selectGeolocation(mockState)).toBe('US-NY');
    });

    it('returns null if geolocation is null', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      expect(selectGeolocation(mockState)).toBeNull();
    });

    it('returns null if RampsController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectGeolocation(mockState)).toBeNull();
    });
  });

  describe('selectRequestsCache', () => {
    it('returns the requests cache', () => {
      const mockRequests = {
        'test-key': {
          status: RequestStatus.SUCCESS,
          data: 'test-data',
          error: null,
          timestamp: Date.now(),
          lastFetchedAt: Date.now(),
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: mockRequests,
            },
          },
        },
      } as unknown as RootState;

      expect(selectRequestsCache(mockState)).toEqual(mockRequests);
    });

    it('returns empty object if requests is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectRequestsCache(mockState)).toEqual({});
    });
  });

  describe('makeSelectRequestState', () => {
    it('returns the request state for a given cache key', () => {
      const mockRequestState = {
        status: RequestStatus.SUCCESS,
        data: 'test-data',
        error: null,
        timestamp: Date.now(),
        lastFetchedAt: Date.now(),
      };

      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': mockRequestState,
              },
            },
          },
        },
      } as unknown as RootState;

      const selectRequestState = makeSelectRequestState('test-key');
      expect(selectRequestState(mockState)).toEqual(mockRequestState);
    });

    it('returns undefined for non-existent cache key', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      const selectRequestState = makeSelectRequestState('non-existent');
      expect(selectRequestState(mockState)).toBeUndefined();
    });
  });

  describe('makeSelectRequestData', () => {
    it('returns the data from a cached request', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': {
                  status: RequestStatus.SUCCESS,
                  data: { value: 123 },
                  error: null,
                  timestamp: Date.now(),
                  lastFetchedAt: Date.now(),
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selectRequestData = makeSelectRequestData<{ value: number }>(
        'test-key',
      );
      expect(selectRequestData(mockState)).toEqual({ value: 123 });
    });

    it('returns null if request does not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      const selectRequestData = makeSelectRequestData('non-existent');
      expect(selectRequestData(mockState)).toBeNull();
    });
  });

  describe('makeSelectRequestIsLoading', () => {
    it('returns true when request is loading', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': {
                  status: RequestStatus.LOADING,
                  data: null,
                  error: null,
                  timestamp: Date.now(),
                  lastFetchedAt: Date.now(),
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selectIsLoading = makeSelectRequestIsLoading('test-key');
      expect(selectIsLoading(mockState)).toBe(true);
    });

    it('returns false when request is not loading', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': {
                  status: RequestStatus.SUCCESS,
                  data: 'data',
                  error: null,
                  timestamp: Date.now(),
                  lastFetchedAt: Date.now(),
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selectIsLoading = makeSelectRequestIsLoading('test-key');
      expect(selectIsLoading(mockState)).toBe(false);
    });

    it('returns false when request does not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      const selectIsLoading = makeSelectRequestIsLoading('non-existent');
      expect(selectIsLoading(mockState)).toBe(false);
    });
  });

  describe('makeSelectRequestError', () => {
    it('returns the error from a failed request', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': {
                  status: RequestStatus.ERROR,
                  data: null,
                  error: 'Something went wrong',
                  timestamp: Date.now(),
                  lastFetchedAt: Date.now(),
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selectError = makeSelectRequestError('test-key');
      expect(selectError(mockState)).toBe('Something went wrong');
    });

    it('returns null when request has no error', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': {
                  status: RequestStatus.SUCCESS,
                  data: 'data',
                  error: null,
                  timestamp: Date.now(),
                  lastFetchedAt: Date.now(),
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selectError = makeSelectRequestError('test-key');
      expect(selectError(mockState)).toBeNull();
    });
  });

  describe('makeSelectRequestStatus', () => {
    it('returns the status of a cached request', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {
                'test-key': {
                  status: RequestStatus.SUCCESS,
                  data: 'data',
                  error: null,
                  timestamp: Date.now(),
                  lastFetchedAt: Date.now(),
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selectStatus = makeSelectRequestStatus('test-key');
      expect(selectStatus(mockState)).toBe(RequestStatus.SUCCESS);
    });

    it('returns IDLE when request does not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      const selectStatus = makeSelectRequestStatus('non-existent');
      expect(selectStatus(mockState)).toBe(RequestStatus.IDLE);
    });
  });
});
