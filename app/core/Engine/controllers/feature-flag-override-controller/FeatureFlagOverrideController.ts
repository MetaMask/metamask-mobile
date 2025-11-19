import {
  BaseController,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

/**
 * State shape for FeatureFlagOverrideController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FeatureFlagOverrideControllerState = {
  overrides: Record<string, unknown>;
};

/**
 * Get default FeatureFlagOverrideController state
 */
export const getDefaultFeatureFlagOverrideControllerState =
  (): FeatureFlagOverrideControllerState => ({
    overrides: {},
  });

/**
 * State metadata for the FeatureFlagOverrideController
 */
const metadata: StateMetadata<FeatureFlagOverrideControllerState> = {
  overrides: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
};

/**
 * Actions that can be called on the FeatureFlagOverrideController
 */
export interface FeatureFlagOverrideControllerActions {
  type: 'FeatureFlagOverrideController:getState';
  handler: () => FeatureFlagOverrideControllerState;
}

/**
 * Get state action type
 */
export interface FeatureFlagOverrideControllerGetStateAction {
  type: 'FeatureFlagOverrideController:getState';
  handler: () => FeatureFlagOverrideControllerState;
}

/**
 * Events emitted by the FeatureFlagOverrideController
 */
export type FeatureFlagOverrideControllerEvents =
  ControllerStateChangeEvent<FeatureFlagOverrideControllerState>;

/**
 * State change event type
 */
export type FeatureFlagOverrideControllerStateChangeEvent =
  ControllerStateChangeEvent<FeatureFlagOverrideControllerState>;

/**
 * Messenger type for FeatureFlagOverrideController
 */
export type FeatureFlagOverrideControllerMessenger = Messenger<
  'FeatureFlagOverrideController',
  FeatureFlagOverrideControllerActions,
  FeatureFlagOverrideControllerEvents
>;

/**
 * Options for creating a FeatureFlagOverrideController
 */
export interface FeatureFlagOverrideControllerOptions {
  messenger: FeatureFlagOverrideControllerMessenger;
  state?: Partial<FeatureFlagOverrideControllerState>;
}

/**
 * FeatureFlagOverrideController - Manages feature flag overrides outside the React layer
 *
 * This controller stores feature flag overrides in a persistent state that can be
 * accessed by other controllers via the messenger system. The React layer (FeatureFlagOverrideContext)
 * uses this controller to manage overrides, keeping the business logic separate from UI concerns.
 */
export class FeatureFlagOverrideController extends BaseController<
  'FeatureFlagOverrideController',
  FeatureFlagOverrideControllerState,
  FeatureFlagOverrideControllerMessenger
> {
  constructor({ messenger, state = {} }: FeatureFlagOverrideControllerOptions) {
    super({
      name: 'FeatureFlagOverrideController',
      metadata,
      messenger,
      state: {
        ...getDefaultFeatureFlagOverrideControllerState(),
        ...state,
      },
    });
  }

  /**
   * Set an override for a feature flag
   * @param key - The feature flag key
   * @param value - The override value
   */
  setOverride(key: string, value: unknown): void {
    this.update((draftState) => {
      draftState.overrides[key] = value;
    });
  }

  /**
   * Remove an override for a feature flag
   * @param key - The feature flag key
   */
  removeOverride(key: string): void {
    this.update((draftState) => {
      delete draftState.overrides[key];
    });
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides(): void {
    this.update((draftState) => {
      draftState.overrides = {};
    });
  }

  /**
   * Check if a feature flag has an override
   * @param key - The feature flag key
   * @returns True if the flag has an override
   */
  hasOverride(key: string): boolean {
    return key in this.state.overrides;
  }

  /**
   * Get the override value for a feature flag
   * @param key - The feature flag key
   * @returns The override value, or undefined if not set
   */
  getOverride(key: string): unknown {
    return this.state.overrides[key];
  }

  /**
   * Get all overrides
   * @returns A copy of all overrides
   */
  getAllOverrides(): Record<string, unknown> {
    return { ...this.state.overrides };
  }

  /**
   * Apply overrides to original feature flags
   * @param originalFlags - The original feature flags
   * @returns Feature flags with overrides applied
   */
  applyOverrides(
    originalFlags: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      ...originalFlags,
      ...this.state.overrides,
    };
  }

  /**
   * Get the count of active overrides
   * @returns The number of active overrides
   */
  getOverrideCount(): number {
    return Object.keys(this.state.overrides).length;
  }

  /**
   * Get a feature flag value with overrides applied
   * @param key - The feature flag key
   * @param originalFlags - The original feature flags
   * @returns The feature flag value with overrides applied, or undefined if not found
   */
  getFeatureFlagWithOverride(
    key: string,
    originalFlags: Record<string, unknown>,
  ): unknown {
    if (this.hasOverride(key)) {
      return this.getOverride(key);
    }
    return originalFlags[key];
  }
}
