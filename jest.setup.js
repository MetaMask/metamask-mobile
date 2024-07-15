// Buffer is made available globally for compatibility reasons
global.Buffer = global.Buffer || require('buffer').Buffer;

// TextEncoder and TextDecoder are now available globally in Node.js v11+

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.DeviceEventEmitter = {
    ...RN.DeviceEventEmitter,
    removeListener: jest.fn(),
  };
  return RN;
});

// If TextEncoder is not available, provide a mock implementation
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = global.TextEncoder || (function() {
    const { TextEncoder } = require('util');
    return TextEncoder;
  })();
}

// If TextDecoder is not available, provide a mock implementation
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = global.TextDecoder || (function() {
    const { TextDecoder } = require('util');
    return TextDecoder;
  })();
}