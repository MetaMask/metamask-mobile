export const fetch = jest.fn();
export const addEventListener = jest.fn(() => jest.fn());

export const NetInfoStateType = {
  none: 'none',
  wifi: 'wifi',
  cellular: 'cellular',
  unknown: 'unknown',
};

export default {
  fetch,
  addEventListener,
  useNetInfo: () => ({ isInternetReachable: false }),
};
