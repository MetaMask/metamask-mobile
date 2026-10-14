export const fetch = jest.fn();
export const addEventListener = jest.fn(() => jest.fn());
export const useNetInfo = jest.fn(() => ({
  type: 'unknown',
  isInternetReachable: null,
  details: null,
}));

export const NetInfoStateType = {
  none: 'none',
  wifi: 'wifi',
  cellular: 'cellular',
  unknown: 'unknown',
};

export default {
  fetch,
  addEventListener,
  useNetInfo,
};
