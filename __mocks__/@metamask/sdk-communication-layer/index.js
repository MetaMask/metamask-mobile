// Mock for @metamask/sdk-communication-layer
const mock = {
  // Mock debug function
  setDebug: jest.fn((e) => {
    if (e) {
      process.env.DEBUG = e;
    } else {
      delete process.env.DEBUG;
    }
  }),

  // Mock communication methods
  sendMessage: jest.fn(),
  receiveMessage: jest.fn(),

  // Mock initialization
  initialize: jest.fn(),

  // Add any other methods that might be used in the project
  // For example:
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn(),
};

module.exports = mock;