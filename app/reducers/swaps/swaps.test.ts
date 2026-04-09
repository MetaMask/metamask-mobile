/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cloneDeep } from 'lodash';
import Device from '../../util/device';

interface SwapsAction {
  type: string | null;
  payload?: object | null;
}

interface SetLivenessPayload {
  chainId: string;
  featureFlags: Record<string, unknown> | null;
}

interface SetLivenessAction {
  type: typeof SWAPS_SET_LIVENESS;
  payload: SetLivenessPayload;
}

interface SwapsState {
  isLive: boolean;
  hasOnboarded: boolean;
  featureFlags?: {
    smart_transactions?: unknown;
    smartTransactions?: unknown;
  };
  '0x1': {
    isLive: boolean;
    featureFlags?: unknown;
  };
  [chainId: string]: unknown;
}

import reducer, {
  initialState,
  SWAPS_SET_LIVENESS,
  SWAPS_SET_HAS_ONBOARDED,
  getFeatureFlagChainId,
} from './index';

const emptyAction: SwapsAction = { type: null };

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
    smartTransactions: {
      expectedDeadline: 45,
      maxDeadline: 150,
      returnTxHashAsap: false,
    },
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
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
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

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
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

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
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

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(false);
    });

    it('should handle missing feature flags by setting isLive to false', () => {
      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: null,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(false);
      expect(liveState['0x1'].featureFlags).toBeUndefined();
      expect(liveState.featureFlags).toBeUndefined();
    });

    it('should set global smart transactions feature flags', () => {
      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState.featureFlags).toEqual({
        smart_transactions: DEFAULT_FEATURE_FLAGS.smart_transactions,
        smartTransactions: DEFAULT_FEATURE_FLAGS.smartTransactions,
      });
    });

    it('should handle multiple chains from feature flags', () => {
      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;

      expect(liveState['0x1'].featureFlags).toEqual(
        DEFAULT_FEATURE_FLAGS.ethereum,
      );
      expect(
        (liveState['0x38'] as { featureFlags?: unknown }).featureFlags,
      ).toEqual(DEFAULT_FEATURE_FLAGS.bsc);
    });

    it('should preserve existing state when updating feature flags', () => {
      const existingState = {
        ...initialState,
        '0x1': {
          isLive: true,
          featureFlags: { oldFlag: true },
          someOtherProperty: 'value',
        },
      };

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newState = reducer(existingState as any, action) as SwapsState;

      expect(newState['0x1'].featureFlags).toEqual(
        DEFAULT_FEATURE_FLAGS.ethereum,
      );
      expect(
        (newState['0x1'] as { someOtherProperty?: string }).someOtherProperty,
      ).toBe('value');
    });

    it('should skip chains without valid chain IDs in name mapping', () => {
      const featureFlagsWithInvalidChain = {
        ...DEFAULT_FEATURE_FLAGS,
        invalidChain: {
          mobileActive: true,
        },
      };

      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: featureFlagsWithInvalidChain,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;

      expect(liveState['0x1'].featureFlags).toEqual(
        DEFAULT_FEATURE_FLAGS.ethereum,
      );
      expect(
        (liveState as Record<string, unknown>).invalidChain,
      ).toBeUndefined();
    });

    it('should skip non-object feature flag values', () => {
      const featureFlagsWithNonObject = {
        ...DEFAULT_FEATURE_FLAGS,
        ethereum: 'not-an-object',
      };

      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: featureFlagsWithNonObject,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;

      expect(liveState['0x1'].featureFlags).toBeUndefined();
    });
  });

  describe('getFeatureFlagChainId', () => {
    it('returns the same chain ID without modification', () => {
      const result = getFeatureFlagChainId('0x1');
      expect(result).toBe('0x1');
    });

    it('returns the same chain ID for any input', () => {
      const result = getFeatureFlagChainId('0x38');
      expect(result).toBe('0x38');
    });
  });

  it('should set has onboarded', () => {
    const initalState = reducer(undefined, emptyAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notOnboardedState = reducer(initalState as any, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: false,
    }) as SwapsState;
    expect(notOnboardedState.hasOnboarded).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveState = reducer(initalState as any, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: true,
    }) as SwapsState;
    expect(liveState.hasOnboarded).toBe(true);
  });
});
