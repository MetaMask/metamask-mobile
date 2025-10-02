/**
 * Centralized exports for Perps test mocks
 * Provides a single import location for all shared testing utilities
 *
 * Usage:
 * ```ts
 * import {
 *   createMockHyperLiquidProvider,
 *   createMockEngineContext,
 *   setupMockDiscountSuccess
 * } from '../__mocks__';
 * ```
 */

// Engine mocks
export * from './engineMocks';

// Provider mocks
export * from './providerMocks';

// Rewards mocks
export * from './rewardsMocks';

/**
 * Common test data and utilities
 */
export const TEST_CONSTANTS = {
  MOCK_ADDRESS: '0x1234567890123456789012345678901234567890',
  MOCK_ACCOUNT_ID: 'mock-account-id',
  MOCK_CAIP_ACCOUNT_ID:
    'eip155:42161:0x1234567890123456789012345678901234567890',
  MOCK_CHAIN_IDS: {
    MAINNET: 'eip155:1',
    ARBITRUM: 'eip155:42161',
  },
  MOCK_DISCOUNT_PERCENTAGE: 20,
} as const;

/**
 * Helper to clear all mocks in a consistent way
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
};
