/* eslint-disable */
// Mock for @nktkas/hyperliquid SDK

// Jest maps SDK specifiers back to this mock, so use Node's resolver to load
// the real public exchange entrypoint.
const { createRequire } = process.getBuiltinModule('module');
const hyperliquidExchangeEntrypoint = createRequire(__filename).resolve(
  '@nktkas/hyperliquid/api/exchange',
);
const { ApiRequestError } = jest.requireActual(hyperliquidExchangeEntrypoint);
// The exchange entrypoint exports ApiRequestError but not its SDK base class.
const HyperliquidError = Object.getPrototypeOf(ApiRequestError);

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

// Mock signing functions
const actionSorter = jest.fn();
const signL1Action = jest.fn();

module.exports = {
  ExchangeClient,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
  actionSorter,
  signL1Action,
  HyperliquidError,
  ApiRequestError,
};
