import reducer, {
  OriginThrottlingState,
  initialState,
  onRPCRequestRejectedByUser,
  resetOriginSpamState,
  REJECTION_THRESHOLD_IN_MS,
} from './index';

const SCAM_ORIGIN_MOCK = 'scam.origin';

describe('originThrottling slice', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeAll(() => {
    dateNowSpy = jest.spyOn(Date, 'now');
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  describe('onRPCRequestRejectedByUser', () => {
    it('handles first rejection for a origin', () => {
      dateNowSpy.mockReturnValue(1000);
      const action = onRPCRequestRejectedByUser(SCAM_ORIGIN_MOCK);
      const state = reducer(initialState, action);

      expect(state.origins[SCAM_ORIGIN_MOCK]).toEqual({
        rejections: 1,
        lastRejection: 1000,
      });
    });

    it('increase rejection count within threshold time', () => {
      const initialStateWithScamOrigin: OriginThrottlingState = {
        ...initialState,
        origins: {
          [SCAM_ORIGIN_MOCK]: {
            rejections: 1,
            lastRejection: 10000,
          },
        },
      };

      dateNowSpy.mockReturnValue(15000);
      const action = onRPCRequestRejectedByUser(SCAM_ORIGIN_MOCK);
      const state = reducer(initialStateWithScamOrigin, action);

      expect(state.origins[SCAM_ORIGIN_MOCK]).toEqual({
        rejections: 2,
        lastRejection: 15000,
      });
    });

    it('reset rejection count if outside threshold time', () => {
      const initialStateWithScamOrigin: OriginThrottlingState = {
        ...initialState,
        origins: {
          [SCAM_ORIGIN_MOCK]: {
            rejections: 2,
            lastRejection: 1000,
          },
        },
      };

      const nextRejectionTimestamp = REJECTION_THRESHOLD_IN_MS + 1000;

      dateNowSpy.mockReturnValue(nextRejectionTimestamp);
      const action = onRPCRequestRejectedByUser(SCAM_ORIGIN_MOCK);
      const state = reducer(initialStateWithScamOrigin, action);

      expect(state.origins[SCAM_ORIGIN_MOCK]).toEqual({
        rejections: 1,
        lastRejection: nextRejectionTimestamp,
      });
    });
  });

  describe('resetOriginSpamState', () => {
    it('reset the state for a specific origin', () => {
      const initialStateWithScamOrigin: OriginThrottlingState = {
        ...initialState,
        origins: {
          [SCAM_ORIGIN_MOCK]: {
            rejections: 3,
            lastRejection: 1000,
          },
        },
      };

      const action = resetOriginSpamState(SCAM_ORIGIN_MOCK);
      const state = reducer(initialStateWithScamOrigin, action);

      expect(state.origins[SCAM_ORIGIN_MOCK]).toBeUndefined();
    });
  });
});
