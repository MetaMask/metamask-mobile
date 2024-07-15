// TextEncoder and TextDecoder are now available globally in Node.js v11+

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.DeviceEventEmitter = {
    ...RN.DeviceEventEmitter,
    removeListener: jest.fn(),
  };
  return RN;
});
