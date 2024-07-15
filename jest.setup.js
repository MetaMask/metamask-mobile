// Define Buffer globally without relying on the 'buffer' module
if (typeof global.Buffer === 'undefined') {
  global.Buffer = {
    from: (input, encoding) => {
      if (typeof input === 'string') {
        return new Uint8Array([...input].map((char) => char.charCodeAt(0)));
      }
      return new Uint8Array(input);
    },
  };
}

// TextEncoder and TextDecoder are now available globally in Node.js v11+

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.DeviceEventEmitter = {
    ...RN.DeviceEventEmitter,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
  return RN;
});

// Mock specific React Native components
jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableOpacity',
  () => 'TouchableOpacity',
);
jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableHighlight',
  () => 'TouchableHighlight',
);
jest.mock(
  'react-native/Libraries/Components/TextInput/TextInput',
  () => 'TextInput',
);

// If TextEncoder is not available, provide a mock implementation
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = function TextEncoder() {
    return {
      encode(input) {
        return global.Buffer.from(input, 'utf-8');
      },
    };
  };
}

// If TextDecoder is not available, provide a mock implementation
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = function TextDecoder() {
    return {
      decode(input) {
        return global.Buffer.from(input).toString('utf-8');
      },
    };
  };
}
