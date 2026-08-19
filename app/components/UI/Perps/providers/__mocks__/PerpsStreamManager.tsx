import React from 'react';

// Mock stream manager
const mockStreamManager = {
  prices: {
    subscribeToSymbols: jest.fn(() => jest.fn()),
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
  },
  orders: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
  },
  positions: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
  },
  fills: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
  },
  account: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
  },
  marketData: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
    prewarm: jest.fn(() => jest.fn()),
  },
  oiCaps: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
    prewarm: jest.fn(() => jest.fn()),
    clearCache: jest.fn(),
  },
  topOfBook: {
    subscribe: jest.fn(() => jest.fn()),
    getSnapshot: jest.fn(() => null),
    clearCache: jest.fn(),
  },
};

// Mock provider component
export const PerpsStreamProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;

// Mock hook
export const usePerpsStream = jest.fn(() => mockStreamManager);

// Export the mock stream manager for test access
export const getStreamManagerInstance = () => mockStreamManager;
