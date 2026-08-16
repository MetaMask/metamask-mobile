import type { PerpsPlatformDependencies, PerpsRemoteFeatureFlagState } from "../types/index.cjs";
import type { ServiceContext } from "./ServiceContext.cjs";
/**
 * FeatureFlagConfigurationService
 *
 * Handles HIP-3 configuration and geo-blocking configuration from remote feature flags.
 * Implements "sticky remote" pattern: once remote config is loaded, never downgrade to fallback.
 * Orchestrates validation, change detection, and version management for feature flag updates.
 *
 * Responsibilities:
 * - Remote feature flag validation and parsing
 * - HIP-3 configuration management (equity, allowlist, blocklist)
 * - Geo-blocking configuration from remote flags
 * - Change detection and version management
 * - "Sticky remote" pattern enforcement (never downgrade)
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export declare class FeatureFlagConfigurationService {
    #private;
    /**
     * Create a new FeatureFlagConfigurationService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps: PerpsPlatformDependencies);
    /**
     * Refresh HIP-3 configuration when remote feature flags change.
     * This method extracts HIP-3 settings from remote flags, validates them,
     * and updates internal state if they differ from current values.
     * When config changes, increments hip3ConfigVersion to trigger ConnectionManager reconnection.
     *
     * Follows the "sticky remote" pattern: once remote config is loaded, never downgrade to fallback.
     *
     * @param options - Configuration object
     * @param options.remoteFeatureFlagControllerState - Remote feature flag state
     * @param options.context - ServiceContext providing state access callbacks
     */
    refreshHip3Config(options: {
        remoteFeatureFlagControllerState: PerpsRemoteFeatureFlagState;
        context: ServiceContext;
    }): void;
    /**
     * Respond to RemoteFeatureFlagController state changes
     * Refreshes user eligibility based on geo-blocked regions defined in remote feature flag.
     * Uses fallback configuration when remote feature flag is undefined.
     * Note: Initial eligibility is set in the constructor if fallback regions are provided.
     *
     * @param options - Configuration object
     * @param options.remoteFeatureFlagControllerState - Remote feature flag state
     * @param options.context - ServiceContext providing callbacks
     */
    refreshEligibility(options: {
        remoteFeatureFlagControllerState: PerpsRemoteFeatureFlagState;
        context: ServiceContext;
    }): void;
    /**
     * Set blocked region list with "never downgrade" pattern enforcement
     * Updates the blocked region list and triggers eligibility refresh.
     * Implements "sticky remote": once remote regions are set, never downgrade to fallback.
     *
     * @param options - Configuration object
     * @param options.list - Array of blocked region codes
     * @param options.source - Source of the list ('remote' or 'fallback')
     * @param options.context - ServiceContext providing callbacks
     */
    setBlockedRegions(options: {
        list: string[];
        source: 'remote' | 'fallback';
        context: ServiceContext;
    }): void;
}
//# sourceMappingURL=FeatureFlagConfigurationService.d.cts.map