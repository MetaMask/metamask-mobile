import { Linking, DeviceEventEmitter } from 'react-native';

Linking.addEventListener = jest.fn();
Linking.removeEventListener = jest.fn((event, callback) => {
  // Simulate the behavior of removeEventListener
  if (typeof callback === 'function') {
    callback();
  }
});
Linking.openURL = jest.fn();
Linking.canOpenURL = jest.fn();
Linking.getInitialURL = jest.fn();

DeviceEventEmitter.addListener = jest.fn();
DeviceEventEmitter.removeListener = jest.fn((event, callback) => {
  // Simulate the behavior of removeListener
  if (typeof callback === 'function') {
    callback();
  }
});

export default { Linking, DeviceEventEmitter };
