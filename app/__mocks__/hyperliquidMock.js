/* eslint-disable */
// Mock for @deeeed/hyperliquid-node20 SDK

const mockExchangeClient = {
  order: jest.fn(),
  modify: jest.fn(),
  cancel: jest.fn(),
};

const mockInfoClient = {
  clearinghouseState: jest.fn(),
  accountState: jest.fn(),
  meta: jest.fn(),
  allMids: jest.fn(),
};

const mockSubscriptionClient = {
  subscription: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  [Symbol.asyncDispose]: jest.fn(),
};

const mockWebSocketTransport = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
  [Symbol.asyncDispose]: jest.fn(),
};

class ExchangeClient {
  constructor() {
    return mockExchangeClient;
  }
}

class InfoClient {
  constructor() {
    return mockInfoClient;
  }
}

class SubscriptionClient {
  constructor() {
    return mockSubscriptionClient;
  }
}

class WebSocketTransport {
  constructor() {
    return mockWebSocketTransport;
  }
}

module.exports = {
  ExchangeClient,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
};