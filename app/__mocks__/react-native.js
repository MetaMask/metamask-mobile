jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    Linking: {
      ...ReactNative.Linking,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn((event, callback) => {
        // Simulate the behavior of removeEventListener
        if (typeof callback === 'function') {
          callback();
        }
      }),
      openURL: jest.fn(),
      canOpenURL: jest.fn(),
      getInitialURL: jest.fn(),
    },
    DeviceEventEmitter: {
      addListener: jest.fn(),
      removeListener: jest.fn((event, callback) => {
        // Simulate the behavior of removeListener
        if (typeof callback === 'function') {
          callback();
        }
      }),
    },
  };
});
