import { initialState } from '../_mocks_/initialState';
import { createBridgeControllerState, createBridgeTestState } from './index';
import { getDefaultBridgeControllerState } from '@metamask/bridge-controller';
import { mockBridgeReducerState } from '../_mocks_/bridgeReducerState';

describe('Bridge Test Utilities', () => {
  describe('createBridgeControllerState', () => {
    it('returns default state when no overrides provided', () => {
      const result = createBridgeControllerState();
      expect(result).toEqual(getDefaultBridgeControllerState());
    });

    it('merges provided overrides with default state', () => {
      const overrides = {
        quotes: [],
      };

      const result = createBridgeControllerState(overrides);

      expect(result).toEqual({
        ...getDefaultBridgeControllerState(),
        ...overrides,
      });
    });

    it('preserves default values for properties not overridden', () => {
      const overrides = {
        quotes: [],
      };

      const result = createBridgeControllerState(overrides);

      expect(result.quotes).toEqual([]);
    });
  });

  describe('createBridgeTestState', () => {
    it('returns complete test state with default values when no overrides provided', () => {
      const result = createBridgeTestState();

      expect(result).toEqual({
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            BridgeController: getDefaultBridgeControllerState(),
          },
        },
        bridge: mockBridgeReducerState,
      });
    });

    it('merges bridge controller overrides with default state', () => {
      const bridgeControllerOverrides = {
        quotes: [],
      };

      const result = createBridgeTestState({
        bridgeControllerOverrides,
      });

      expect(result.engine.backgroundState.BridgeController).toEqual({
        ...getDefaultBridgeControllerState(),
        ...bridgeControllerOverrides,
      });
    });

    it('merges bridge reducer overrides with default state', () => {
      const bridgeReducerOverrides = {
        sourceAmount: '2000000000000000000',
        destAmount: '1000000000000000000',
      };

      const result = createBridgeTestState({
        bridgeReducerOverrides,
      });

      expect(result.bridge).toEqual({
        ...mockBridgeReducerState,
        ...bridgeReducerOverrides,
      });
    });

    it('preserves other engine background state properties', () => {
      const result = createBridgeTestState();

      expect(result.engine.backgroundState).toEqual({
        ...initialState.engine.backgroundState,
        BridgeController: getDefaultBridgeControllerState(),
      });
    });
  });
});
