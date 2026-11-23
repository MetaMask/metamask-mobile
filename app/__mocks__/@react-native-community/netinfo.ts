export const fetch = jest.fn();
export const addEventListener = jest.fn(() => jest.fn());

export const NetInfoStateType = {
  none: 'none',
  wifi: 'wifi',
  cellular: 'cellular',
  unknown: 'unknown',
};

interface MockNetInfoState {
  type?: string;
  isInternetReachable?: boolean | null;
  details?: Record<string, unknown> | null;
}

const OFFLINE_NET_INFO: MockNetInfoState = { isInternetReachable: false };
let mockNetInfo = OFFLINE_NET_INFO;

/**
 * Plain function (not `jest.fn`) so `jest.resetAllMocks()` elsewhere cannot
 * strip the default and crash `useNetworkTier`.
 */
export const useNetInfo = () => mockNetInfo;

/** Test helper: the state `useNetInfo` returns until `__resetMockNetInfo`. */
export const __setMockNetInfo = (state: MockNetInfoState): void => {
  mockNetInfo = state;
};

/** Test helper: back to the offline default. */
export const __resetMockNetInfo = (): void => {
  mockNetInfo = OFFLINE_NET_INFO;
};

export default {
  fetch,
  addEventListener,
  useNetInfo,
  __setMockNetInfo,
  __resetMockNetInfo,
};
