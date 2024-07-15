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
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class {
    encode(input) {
      return new Uint8Array(Buffer.from(input));
    }
  };
}

// If TextDecoder is not available, provide a mock implementation
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class {
    decode(input) {
      return Buffer.from(input).toString('utf8');
    }
  };
}