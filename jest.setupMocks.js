// This file will contain Jest setup for mocking global modules
jest.mock('@metamask/sdk-communication-layer', () => ({
  // Mock functions and properties
  setDebug: jest.fn(),
  sendMessage: jest.fn(),
  receiveMessage: jest.fn(),
  initialize: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn(),
}));