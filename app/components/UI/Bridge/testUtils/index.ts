import {
  type BridgeControllerState,
  getDefaultBridgeControllerState,
} from '@metamask/bridge-controller';
import { initialState } from '../_mocks_/initialState';
import { mockBridgeReducerState } from '../_mocks_/bridgeReducerState';

type BridgeControllerStateOverride = Partial<BridgeControllerState>;

/**
 * Creates a complete bridge controller state by merging default state with overrides
 * @param overrides - Partial state to override default values
 * @returns Complete bridge controller state
 */
export const createBridgeControllerState = (
  overrides: BridgeControllerStateOverride = {},
): BridgeControllerState => ({
  ...getDefaultBridgeControllerState(),
  ...overrides,
});

/**
 * Creates a complete test state for bridge components/hooks
 * @param bridgeControllerOverrides - Overrides for bridge controller state
 * @param bridgeReducerOverrides - Overrides for bridge reducer state
 * @returns Complete test state
 */
export const createBridgeTestState = (
  bridgeControllerOverrides: BridgeControllerStateOverride = {},
  bridgeReducerOverrides = {},
) => {
  const bridgeControllerState = createBridgeControllerState(
    bridgeControllerOverrides,
  );

  return {
    ...initialState,
    engine: {
      ...initialState.engine,
      backgroundState: {
        ...initialState.engine.backgroundState,
        BridgeController: bridgeControllerState,
      },
    },
    bridge: {
      ...mockBridgeReducerState,
      ...bridgeReducerOverrides,
    },
  };
};
