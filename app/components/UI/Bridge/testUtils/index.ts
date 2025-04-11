import {
  type BridgeControllerState,
  getDefaultBridgeControllerState,
} from '@metamask/bridge-controller';
import { initialState } from '../_mocks_/initialState';
import { mockBridgeReducerState } from '../_mocks_/bridgeReducerState';
import type { BridgeState } from '../../../../core/redux/slices/bridge';

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
 * @param overrides - Object containing optional overrides for bridge controller and reducer state
 * @returns Complete test state
 */
export const createBridgeTestState = (
  overrides: {
    bridgeControllerOverrides?: BridgeControllerStateOverride;
    bridgeReducerOverrides?: Partial<BridgeState>;
  } = {},
) => {
  const bridgeControllerState = createBridgeControllerState(
    overrides.bridgeControllerOverrides ?? {},
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
      ...(overrides.bridgeReducerOverrides ?? {}),
    },
  };
};
