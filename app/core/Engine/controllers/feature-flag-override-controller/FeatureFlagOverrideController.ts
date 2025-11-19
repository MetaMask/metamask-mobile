import {
  BaseController,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type {
  RemoteFeatureFlagControllerState,
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import type { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

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
export type FeatureFlagOverrideControllerEvents = ControllerStateChangeEvent<
  'FeatureFlagOverrideController',
  FeatureFlagOverrideControllerState
>;

/**
 * State change event type
 */
export type FeatureFlagOverrideControllerStateChangeEvent =
  ControllerStateChangeEvent<
    'FeatureFlagOverrideController',
    FeatureFlagOverrideControllerState
  >;

/**
 * Messenger type for FeatureFlagOverrideController
 */
export type FeatureFlagOverrideControllerMessenger = Messenger<
  'FeatureFlagOverrideController',
  | FeatureFlagOverrideControllerActions
  | RemoteFeatureFlagControllerGetStateAction,
  | FeatureFlagOverrideControllerEvents
  | RemoteFeatureFlagControllerStateChangeEvent
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
  /**
   * Cached state from RemoteFeatureFlagController
   * This is updated automatically when RemoteFeatureFlagController state changes
   */
  private remoteFeatureFlagState: RemoteFeatureFlagControllerState | null =
    null;

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

    // Subscribe to RemoteFeatureFlagController state changes
    this.messenger.subscribe(
      'RemoteFeatureFlagController:stateChange',
      this.handleRemoteFeatureFlagStateChange.bind(this),
    );

    // Get initial RemoteFeatureFlagController state
    try {
      const initialState = this.messenger.call(
        'RemoteFeatureFlagController:getState',
      );
      this.remoteFeatureFlagState = initialState;
    } catch (error) {
      // RemoteFeatureFlagController might not be initialized yet
      // This is okay, we'll get the state when it changes
    }
  }

  /**
   * Handle RemoteFeatureFlagController state changes
   * @param state - The new state from RemoteFeatureFlagController
   */
  private handleRemoteFeatureFlagStateChange(
    state: RemoteFeatureFlagControllerState,
  ): void {
    this.remoteFeatureFlagState = state;
  }

  /**
   * Get the current RemoteFeatureFlagController state
   * @returns The current remote feature flag state, or null if not available
   */
  private getRemoteFeatureFlagState(): RemoteFeatureFlagControllerState | null {
    // Try to get fresh state if we don't have it cached
    if (!this.remoteFeatureFlagState) {
      try {
        this.remoteFeatureFlagState = this.messenger.call(
          'RemoteFeatureFlagController:getState',
        );
      } catch (error) {
        // RemoteFeatureFlagController might not be initialized yet
        return null;
      }
    }
    return this.remoteFeatureFlagState;
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

  /**
   * Get a feature flag value with overrides applied
   * This method automatically gets the remote feature flags and applies overrides
   * @param key - The feature flag key
   * @returns The feature flag value with overrides applied, or undefined if not found
   */
  getFeatureFlag(key: string): unknown {
    const remoteState = this.getRemoteFeatureFlagState();
    const originalFlags = remoteState?.remoteFeatureFlags ?? {};
    return this.getFeatureFlagWithOverride(key, originalFlags);
  }

  /**
   * Get a boolean feature flag value with overrides applied
   * @param key - The feature flag key
   * @param fallback - Optional fallback value if flag is not found (defaults to false)
   * @returns The boolean feature flag value with overrides applied
   */
  getBooleanFeatureFlag(key: string, fallback: boolean = false): boolean {
    const value = this.getFeatureFlag(key);
    if (typeof value === 'boolean') {
      return value;
    }
    return fallback;
  }

  /**
   * Get a string feature flag value with overrides applied
   * @param key - The feature flag key
   * @param fallback - Optional fallback value if flag is not found
   * @returns The string feature flag value with overrides applied, or fallback
   */
  getStringFeatureFlag(key: string, fallback?: string): string | undefined {
    const value = this.getFeatureFlag(key);
    if (typeof value === 'string') {
      return value;
    }
    return fallback;
  }

  /**
   * Get a number feature flag value with overrides applied
   * @param key - The feature flag key
   * @param fallback - Optional fallback value if flag is not found
   * @returns The number feature flag value with overrides applied, or fallback
   */
  getNumberFeatureFlag(key: string, fallback?: number): number | undefined {
    const value = this.getFeatureFlag(key);
    if (typeof value === 'number') {
      return value;
    }
    return fallback;
  }

  /**
   * Get an array feature flag value with overrides applied
   * @param key - The feature flag key
   * @param fallback - Optional fallback value if flag is not found (defaults to empty array)
   * @returns The array feature flag value with overrides applied
   */
  getArrayFeatureFlag<T = unknown>(key: string, fallback: T[] = []): T[] {
    const value = this.getFeatureFlag(key);
    if (Array.isArray(value)) {
      return value as T[];
    }
    return fallback;
  }

  /**
   * Get an object feature flag value with overrides applied
   * @param key - The feature flag key
   * @param fallback - Optional fallback value if flag is not found
   * @returns The object feature flag value with overrides applied, or fallback
   */
  getObjectFeatureFlag<T = Record<string, unknown>>(
    key: string,
    fallback?: T,
  ): T | undefined {
    const value = this.getFeatureFlag(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as T;
    }
    return fallback;
  }

  /**
   * Get a version-gated feature flag value with overrides applied
   * This is a convenience method for flags that have the structure { enabled: boolean, minimumVersion: string }
   * @param key - The feature flag key
   * @param fallback - Optional fallback value if flag is not found
   * @returns The version-gated feature flag value with overrides applied, or fallback
   */
  getVersionGatedFeatureFlag(
    key: string,
    fallback?: VersionGatedFeatureFlag,
  ): VersionGatedFeatureFlag | undefined {
    const value = this.getFeatureFlag(key);
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'enabled' in value &&
      'minimumVersion' in value &&
      typeof (value as VersionGatedFeatureFlag).enabled === 'boolean' &&
      typeof (value as VersionGatedFeatureFlag).minimumVersion === 'string'
    ) {
      return value as VersionGatedFeatureFlag;
    }
    return fallback;
  }

  /**
   * Apply all overrides to remote feature flags
   * This returns a new object with all overrides applied, useful when you need multiple flags
   * @returns A new object with all remote feature flags and overrides applied
   */
  applyOverridesToRemoteFlags(): Record<string, unknown> {
    const remoteState = this.getRemoteFeatureFlagState();
    const originalFlags = remoteState?.remoteFeatureFlags ?? {};
    return this.applyOverrides(originalFlags);
  }
}
