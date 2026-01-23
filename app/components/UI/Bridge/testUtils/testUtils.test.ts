import {
  createBridgeControllerState,
  createBridgeTestState,
  createMockToken,
  createMockTokenWithBalance,
  createMockPopularToken,
  createMockBalanceData,
  createMockSearchResponse,
  createMockPaginatedResponse,
  MOCK_CHAIN_IDS,
} from './index';
import { getDefaultBridgeControllerState } from '@metamask/bridge-controller';
import { mockBridgeReducerState } from '../_mocks_/bridgeReducerState';

describe('Bridge Test Utilities', () => {
  describe('createBridgeControllerState', () => {
    it('returns default state when no overrides', () => {
      expect(createBridgeControllerState()).toEqual(
        getDefaultBridgeControllerState(),
      );
    });

    it('merges overrides with default state', () => {
      const result = createBridgeControllerState({ quotes: [] });
      expect(result.quotes).toEqual([]);
    });
  });

  describe('createBridgeTestState', () => {
    it('returns complete state with defaults', () => {
      const result = createBridgeTestState();
      expect(result.engine.backgroundState.BridgeController).toEqual(
        getDefaultBridgeControllerState(),
      );
      expect(result.bridge).toEqual(mockBridgeReducerState);
    });

    it('merges controller and reducer overrides', () => {
      const result = createBridgeTestState({
        bridgeControllerOverrides: { quotes: [] },
        bridgeReducerOverrides: { sourceAmount: '1000' },
      });
      expect(result.engine.backgroundState.BridgeController.quotes).toEqual([]);
      expect(result.bridge.sourceAmount).toBe('1000');
    });
  });

  describe('Token Fixtures', () => {
    it.each([
      ['createMockToken', createMockToken, { symbol: 'TEST', chainId: '0x1' }],
      [
        'createMockTokenWithBalance',
        createMockTokenWithBalance,
        { balance: '100.0' },
      ],
      [
        'createMockPopularToken',
        createMockPopularToken,
        { chainId: MOCK_CHAIN_IDS.ethereum },
      ],
      ['createMockBalanceData', createMockBalanceData, { balance: '1.0' }],
    ])('%s creates fixture with defaults', (_, factory, expected) => {
      expect(factory()).toMatchObject(expected);
    });

    it.each([
      ['createMockToken', createMockToken, { symbol: 'ETH' }],
      ['createMockPopularToken', createMockPopularToken, { symbol: 'USDC' }],
    ])('%s applies overrides', (_, factory, override) => {
      expect(factory(override)).toMatchObject(override);
    });
  });

  describe('API Response Fixtures', () => {
    it('creates search response with defaults', () => {
      const response = createMockSearchResponse();
      expect(response.data).toHaveLength(1);
      expect(response.pageInfo.hasNextPage).toBe(false);
    });

    it('creates paginated response with cursor', () => {
      const response = createMockPaginatedResponse({ cursor: 'next' });
      expect(response.pageInfo.hasNextPage).toBe(true);
      expect(response.pageInfo.endCursor).toBe('next');
    });
  });
});
