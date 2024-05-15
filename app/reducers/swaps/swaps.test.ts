/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cloneDeep } from 'lodash';
import Device from '../../util/device';
import reducer, {
  initialState,
  SWAPS_SET_LIVENESS,
  SWAPS_SET_HAS_ONBOARDED,
  swapsSmartTxFlagEnabled,
} from './index';

const emptyAction = { type: null };

const DEFAULT_FEATURE_FLAGS = {
  ethereum: {
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
  bsc: {
    mobile_active: true,
    extension_active: true,
    fallback_to_v1: false,
    fallbackToV1: false,
    mobileActive: true,
    extensionActive: true,
    mobileActiveIOS: true,
    mobileActiveAndroid: true,
    smartTransactions: {},
  },
  smart_transactions: {
    mobile_active: false,
    extension_active: true,
  },
  smartTransactions: {
    mobileActive: false,
    extensionActive: true,
    mobileActiveIOS: false,
    mobileActiveAndroid: false,
  },
};

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
      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(true);
    });
    it('should set isLive to false for iOS when flag is false', () => {
      Device.isIos = jest.fn().mockReturnValue(true);
      Device.isAndroid = jest.fn().mockReturnValue(false);

      const initalState = reducer(undefined, emptyAction);
      const featureFlags = cloneDeep(DEFAULT_FEATURE_FLAGS);
      featureFlags.ethereum = {
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
      };

      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(false);
    });
    it('should set isLive to true for Android when flag is true', () => {
      Device.isIos = jest.fn().mockReturnValue(false);
      Device.isAndroid = jest.fn().mockReturnValue(true);

      const initalState = reducer(undefined, emptyAction);
      const featureFlags = cloneDeep(DEFAULT_FEATURE_FLAGS);
      featureFlags.ethereum = {
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
      };

      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(true);
    });
    it('should set isLive to false for Android when flag is false', () => {
      Device.isIos = jest.fn().mockReturnValue(false);
      Device.isAndroid = jest.fn().mockReturnValue(true);

      const initalState = reducer(undefined, emptyAction);
      const featureFlags = cloneDeep(DEFAULT_FEATURE_FLAGS);
      featureFlags.ethereum = {
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
      };

      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(false);
    });
  });

  describe('swapsSmartTxFlagEnabled', () => {
    it('should return true if smart transactions are enabled', () => {
      const rootState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: { chainId: '0x1' },
            },
          },
        },
        swaps: cloneDeep(initialState),
      };

      rootState.swaps = {
        // @ts-ignore
        featureFlags: {
          smart_transactions: {
            mobile_active: true,
            extension_active: true,
          },
          smartTransactions: {
            mobileActive: true,
            extensionActive: true,
            mobileActiveIOS: true,
            mobileActiveAndroid: true,
          },
        },
        '0x1': {
          // @ts-ignore
          featureFlags: {
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              returnTxHashAsap: false,
            },
          },
        },
      };

      const enabled = swapsSmartTxFlagEnabled(rootState);
      expect(enabled).toEqual(true);
    });

    it('should return false if smart transactions flags are disabled', () => {
      const rootState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: { chainId: '0x1' },
            },
          },
        },
        swaps: cloneDeep(initialState),
      };

      rootState.swaps = {
        // @ts-ignore
        featureFlags: {
          smart_transactions: {
            mobile_active: false,
            extension_active: true,
          },
          smartTransactions: {
            mobileActive: false,
            extensionActive: true,
            mobileActiveIOS: false,
            mobileActiveAndroid: false,
          },
        },
        '0x1': {
          // @ts-ignore
          featureFlags: {
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              returnTxHashAsap: false,
            },
          },
        },
      };

      const enabled = swapsSmartTxFlagEnabled(rootState);
      expect(enabled).toEqual(false);
    });

    it('should return false if smart transactions flags are undefined', () => {
      const rootState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: { chainId: '0x1' },
            },
          },
        },
        swaps: initialState,
      };

      const enabled = swapsSmartTxFlagEnabled(rootState);
      expect(enabled).toEqual(false);
    });
  });

  it('should set has onboarded', () => {
    const initalState = reducer(undefined, emptyAction);
    // @ts-ignore
    const notOnboardedState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: false,
    });
    expect(notOnboardedState.hasOnboarded).toBe(false);
    // @ts-ignore
    const liveState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: true,
    });
    expect(liveState.hasOnboarded).toBe(true);
  });
});
