var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _FeatureFlagConfigurationService_instances, _FeatureFlagConfigurationService_deps, _FeatureFlagConfigurationService_validateMarketList, _FeatureFlagConfigurationService_filterValidPatterns, _FeatureFlagConfigurationService_arraysHaveDifferentValues;
import { hasProperty } from "@metamask/utils";
import { PERPS_CONSTANTS } from "../constants/perpsConfig.mjs";
import { isVersionGatedFeatureFlag } from "../types/index.mjs";
import { ensureError } from "../utils/errorUtils.mjs";
import { validateMarketPattern } from "../utils/marketUtils.mjs";
import { parseCommaSeparatedString, stripQuotes } from "../utils/stringParseUtils.mjs";
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
export class FeatureFlagConfigurationService {
    /**
     * Create a new FeatureFlagConfigurationService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps) {
        _FeatureFlagConfigurationService_instances.add(this);
        _FeatureFlagConfigurationService_deps.set(this, void 0);
        __classPrivateFieldSet(this, _FeatureFlagConfigurationService_deps, deps, "f");
    }
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
    refreshHip3Config(options) {
        const { remoteFeatureFlagControllerState, context } = options;
        if (!context.getHip3Config ||
            !context.setHip3Config ||
            !context.incrementHip3ConfigVersion) {
            throw new Error('Required HIP-3 callbacks not available in ServiceContext');
        }
        const remoteFlags = remoteFeatureFlagControllerState.remoteFeatureFlags;
        const currentConfig = context.getHip3Config();
        // Extract and validate remote HIP-3 equity enabled flag
        const equityFlag = remoteFlags?.perpsHip3Enabled;
        // Use type guard to validate before calling - validatedVersionGatedFeatureFlag also
        // handles invalid flags internally, but proper typing requires the guard
        const validatedEquity = isVersionGatedFeatureFlag(equityFlag)
            ? __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").featureFlags.validateVersionGated(equityFlag)
            : undefined;
        __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log('PerpsController: HIP-3 equity flag validation', {
            equityFlag,
            validatedEquity,
            willUse: validatedEquity === undefined ? 'fallback' : 'remote',
        });
        // Extract and validate remote HIP-3 market lists
        const validatedAllowlistMarkets = hasProperty(remoteFlags, 'perpsHip3AllowlistMarkets')
            ? __classPrivateFieldGet(this, _FeatureFlagConfigurationService_instances, "m", _FeatureFlagConfigurationService_validateMarketList).call(this, remoteFlags.perpsHip3AllowlistMarkets, 'allowlistMarkets', currentConfig.allowlistMarkets)
            : undefined;
        const validatedBlocklistMarkets = hasProperty(remoteFlags, 'perpsHip3BlocklistMarkets')
            ? __classPrivateFieldGet(this, _FeatureFlagConfigurationService_instances, "m", _FeatureFlagConfigurationService_validateMarketList).call(this, remoteFlags.perpsHip3BlocklistMarkets, 'blocklistMarkets', currentConfig.blocklistMarkets)
            : undefined;
        // Detect changes (only if we have valid remote values)
        const equityChanged = validatedEquity !== undefined &&
            validatedEquity !== currentConfig.enabled;
        const allowlistMarketsChanged = validatedAllowlistMarkets !== undefined &&
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_instances, "m", _FeatureFlagConfigurationService_arraysHaveDifferentValues).call(this, validatedAllowlistMarkets, currentConfig.allowlistMarkets);
        const blocklistMarketsChanged = validatedBlocklistMarkets !== undefined &&
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_instances, "m", _FeatureFlagConfigurationService_arraysHaveDifferentValues).call(this, validatedBlocklistMarkets, currentConfig.blocklistMarkets);
        if (equityChanged || allowlistMarketsChanged || blocklistMarketsChanged) {
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log('PerpsController: HIP-3 config changed via remote feature flags', {
                equityChanged,
                allowlistMarketsChanged,
                blocklistMarketsChanged,
                oldEquity: currentConfig.enabled,
                newEquity: validatedEquity,
                oldAllowlistMarkets: currentConfig.allowlistMarkets,
                newAllowlistMarkets: validatedAllowlistMarkets,
                oldBlocklistMarkets: currentConfig.blocklistMarkets,
                newBlocklistMarkets: validatedBlocklistMarkets,
                source: 'remote',
            });
            // Update internal state (sticky remote - never downgrade)
            context.setHip3Config({
                enabled: validatedEquity,
                allowlistMarkets: validatedAllowlistMarkets
                    ? [...validatedAllowlistMarkets]
                    : undefined,
                blocklistMarkets: validatedBlocklistMarkets
                    ? [...validatedBlocklistMarkets]
                    : undefined,
                source: 'remote',
            });
            // Increment version to trigger ConnectionManager reconnection and cache clearing
            const newVersion = context.incrementHip3ConfigVersion();
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log('PerpsController: Incremented hip3ConfigVersion to trigger reconnection', {
                newVersion,
                newHip3Enabled: validatedEquity ?? currentConfig.enabled,
                newHip3AllowlistMarkets: validatedAllowlistMarkets ?? currentConfig.allowlistMarkets,
                newHip3BlocklistMarkets: validatedBlocklistMarkets ?? currentConfig.blocklistMarkets,
            });
            // Note: ConnectionManager will handle:
            // 1. Detecting hip3ConfigVersion change via Redux monitoring
            // 2. Clearing all StreamManager caches
            // 3. Calling reconnectWithNewContext() -> initializeProviders()
            // 4. Provider reinitialization will read the new HIP-3 config below
        }
    }
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
    refreshEligibility(options) {
        const { remoteFeatureFlagControllerState, context } = options;
        const perpsGeoBlockedRegionsFeatureFlag = 
        // NOTE: Do not use perpsPerpTradingGeoBlockedCountries as it is deprecated.
        remoteFeatureFlagControllerState.remoteFeatureFlags
            ?.perpsPerpTradingGeoBlockedCountriesV2;
        const remoteBlockedRegions = perpsGeoBlockedRegionsFeatureFlag?.blockedRegions;
        if (Array.isArray(remoteBlockedRegions)) {
            this.setBlockedRegions({
                list: remoteBlockedRegions,
                source: 'remote',
                context,
            });
        }
        // Also check for HIP-3 config changes
        this.refreshHip3Config({ remoteFeatureFlagControllerState, context });
    }
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
    setBlockedRegions(options) {
        const { list, source, context } = options;
        if (!context.getBlockedRegionList ||
            !context.setBlockedRegionList ||
            !context.refreshEligibility) {
            throw new Error('Required blocked region callbacks not available in ServiceContext');
        }
        const currentList = context.getBlockedRegionList();
        // Never downgrade from remote to fallback
        if (source === 'fallback' && currentList.source === 'remote') {
            return;
        }
        if (Array.isArray(list)) {
            context.setBlockedRegionList(list, source);
        }
        context.refreshEligibility().catch((error) => {
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").logger.error(ensureError(error, 'FeatureFlagConfigurationService.setBlockedRegions'), {
                tags: { feature: PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'FeatureFlagConfigurationService.setBlockedRegions',
                    data: { source },
                },
            });
        });
    }
}
_FeatureFlagConfigurationService_deps = new WeakMap(), _FeatureFlagConfigurationService_instances = new WeakSet(), _FeatureFlagConfigurationService_validateMarketList = function _FeatureFlagConfigurationService_validateMarketList(remoteValue, fieldName, currentValue) {
    __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log(`PerpsController: HIP-3 ${fieldName} validation`, {
        remoteValue,
        type: typeof remoteValue,
        isArray: Array.isArray(remoteValue),
    });
    // LaunchDarkly returns comma-separated strings for list values
    // Values may have literal quotes (e.g., '"xyz"') due to JSON encoding quirks
    if (typeof remoteValue === 'string') {
        const parsed = __classPrivateFieldGet(this, _FeatureFlagConfigurationService_instances, "m", _FeatureFlagConfigurationService_filterValidPatterns).call(this, parseCommaSeparatedString(remoteValue).map(stripQuotes), fieldName);
        if (parsed.length > 0) {
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log(`PerpsController: HIP-3 ${fieldName} validated from string`, { validatedMarkets: parsed });
            return parsed;
        }
        __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log(`PerpsController: HIP-3 ${fieldName} string was empty after parsing`, { fallbackValue: currentValue });
        return undefined;
    }
    // Fallback: Validate array of non-empty strings
    if (Array.isArray(remoteValue) &&
        remoteValue.every((item) => typeof item === 'string' && item.length > 0)) {
        const validatedMarkets = __classPrivateFieldGet(this, _FeatureFlagConfigurationService_instances, "m", _FeatureFlagConfigurationService_filterValidPatterns).call(this, remoteValue
            .map((market) => stripQuotes(market.trim()))
            .filter((market) => market.length > 0), fieldName);
        if (validatedMarkets.length > 0) {
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log(`PerpsController: HIP-3 ${fieldName} validated from array`, { validatedMarkets });
            return validatedMarkets;
        }
        __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log(`PerpsController: HIP-3 ${fieldName} array was empty after filtering`, { fallbackValue: currentValue });
        return undefined;
    }
    __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").debugLogger.log(`PerpsController: HIP-3 ${fieldName} validation FAILED - falling back to local config`, {
        reason: Array.isArray(remoteValue)
            ? 'Array contains non-string or empty values'
            : 'Invalid type (expected string or array)',
        fallbackValue: currentValue,
    });
    return undefined;
}, _FeatureFlagConfigurationService_filterValidPatterns = function _FeatureFlagConfigurationService_filterValidPatterns(patterns, fieldName) {
    return patterns.filter((pattern) => {
        try {
            validateMarketPattern(pattern);
            return true;
        }
        catch (error) {
            __classPrivateFieldGet(this, _FeatureFlagConfigurationService_deps, "f").logger.error(ensureError(error, `FeatureFlagConfigurationService.filterValidPatterns`), {
                tags: { feature: PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'FeatureFlagConfigurationService.filterValidPatterns',
                    data: { fieldName, pattern },
                },
            });
            return false;
        }
    });
}, _FeatureFlagConfigurationService_arraysHaveDifferentValues = function _FeatureFlagConfigurationService_arraysHaveDifferentValues(a, b) {
    return (JSON.stringify([...a].sort((itemA, itemB) => itemA.localeCompare(itemB))) !==
        JSON.stringify([...b].sort((itemA, itemB) => itemA.localeCompare(itemB))));
};
//# sourceMappingURL=FeatureFlagConfigurationService.mjs.map