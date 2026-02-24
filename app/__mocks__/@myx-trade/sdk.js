/* eslint-disable */
// Mock for @myx-trade/sdk
// Prevents Jest failures from lodash-es (ESM-only) imported by the real SDK

const mockMarkets = {
  getPoolSymbolAll: jest.fn().mockResolvedValue([]),
  getTickerList: jest.fn().mockResolvedValue([]),
};

class MyxClient {
  constructor() {
    this.markets = mockMarkets;
  }
}

module.exports = {
  MyxClient,
};
