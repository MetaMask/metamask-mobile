import Device from '../../util/device';
import reducer, {
  initialState,
  SWAPS_SET_LIVENESS,
  SWAPS_SET_HAS_ONBOARDED,
} from './index';

const emptyAction = { type: null };

describe('swaps reducer', () => {
  it('should return initial state', () => {
    const state = reducer(undefined, emptyAction);
    expect(state).toEqual(initialState);
  });

  describe('liveness', () => {
    it('should set isLive to true for iOS when flag is true', () => {
      Device.isIos = jest.fn().mockReturnValue(true);
      Device.isAndroid = jest.fn().mockReturnValue(false);

      const initalState = reducer(undefined, emptyAction);
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: {
            mobile_active: true,
            extension_active: true,
            fallback_to_v1: false,
            fallbackToV1: false,
            mobileActive: true,
            extensionActive: true,
            mobileActiveIOS: true,
            mobileActiveAndroid: true,
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              returnTxHashAsap: false,
            },
          },
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(true);
    });
    it('should set isLive to false for iOS when flag is false', () => {
      Device.isIos = jest.fn().mockReturnValue(true);
      Device.isAndroid = jest.fn().mockReturnValue(false);

      const initalState = reducer(undefined, emptyAction);
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: {
            mobile_active: false,
            extension_active: true,
            fallback_to_v1: false,
            fallbackToV1: false,
            mobileActive: false,
            extensionActive: true,
            mobileActiveIOS: false,
            mobileActiveAndroid: true,
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              returnTxHashAsap: false,
            },
          },
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(false);
    });
    it('should set isLive to true for Android when flag is true', () => {
      Device.isIos = jest.fn().mockReturnValue(false);
      Device.isAndroid = jest.fn().mockReturnValue(true);

      const initalState = reducer(undefined, emptyAction);
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: {
            mobile_active: true,
            extension_active: true,
            fallback_to_v1: false,
            fallbackToV1: false,
            mobileActive: true,
            extensionActive: true,
            mobileActiveIOS: true,
            mobileActiveAndroid: true,
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              returnTxHashAsap: false,
            },
          },
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(true);
    });
    it('should set isLive to false for Android when flag is false', () => {
      Device.isIos = jest.fn().mockReturnValue(false);
      Device.isAndroid = jest.fn().mockReturnValue(true);

      const initalState = reducer(undefined, emptyAction);
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: {
            mobile_active: false,
            extension_active: true,
            fallback_to_v1: false,
            fallbackToV1: false,
            mobileActive: false,
            extensionActive: true,
            mobileActiveIOS: false,
            mobileActiveAndroid: false,
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              returnTxHashAsap: false,
            },
          },
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(false);
    });
  });

  it('should set has onboarded', () => {
    const initalState = reducer(undefined, emptyAction);
    const notOnboardedState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: false,
    });
    expect(notOnboardedState.hasOnboarded).toBe(false);
    const liveState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: true,
    });
    expect(liveState.hasOnboarded).toBe(true);
  });
});
