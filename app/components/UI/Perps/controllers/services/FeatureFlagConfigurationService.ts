import { hasProperty } from '@metamask/utils';
import {
  type VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../utils/perpsErrorHandler';
import { parseCommaSeparatedString } from '../../utils/stringParseUtils';
import type { ServiceContext } from './ServiceContext';

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
 */
export class FeatureFlagConfigurationService {
  /**
   * Error context helper for consistent logging
   */
  private static getErrorContext(
    method: string,
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      controller: 'FeatureFlagConfigurationService',
      method,
      ...additionalContext,
    };
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
   * @param options.remoteFeatureFlagControllerState - State from RemoteFeatureFlagController
   * @param options.context - ServiceContext providing state access callbacks
   */
  static refreshHip3Config(options: {
    remoteFeatureFlagControllerState: RemoteFeatureFlagControllerState;
    context: ServiceContext;
  }): void {
    const { remoteFeatureFlagControllerState, context } = options;

    if (
      !context.getHip3Config ||
      !context.setHip3Config ||
      !context.incrementHip3ConfigVersion
    ) {
      throw new Error(
        'Required HIP-3 callbacks not available in ServiceContext',
      );
    }

    const remoteFlags = remoteFeatureFlagControllerState.remoteFeatureFlags;
    const currentConfig = context.getHip3Config();

    // Extract and validate remote HIP-3 equity enabled flag
    const equityFlag =
      remoteFlags?.perpsHip3Enabled as unknown as VersionGatedFeatureFlag;
    const validatedEquity = validatedVersionGatedFeatureFlag(equityFlag);

    DevLogger.log('PerpsController: HIP-3 equity flag validation', {
      equityFlag,
      validatedEquity,
      willUse: validatedEquity !== undefined ? 'remote' : 'fallback',
    });

    // Extract and validate remote HIP-3 allowlist markets (allowlist)
    let validatedAllowlistMarkets: string[] | undefined;
    if (hasProperty(remoteFlags, 'perpsHip3AllowlistMarkets')) {
      const remoteMarkets = remoteFlags.perpsHip3AllowlistMarkets;

      DevLogger.log('PerpsController: HIP-3 allowlistMarkets validation', {
        remoteMarkets,
        type: typeof remoteMarkets,
        isArray: Array.isArray(remoteMarkets),
      });

      // LaunchDarkly returns comma-separated strings for list values
      if (typeof remoteMarkets === 'string') {
        const parsed = parseCommaSeparatedString(remoteMarkets);

        if (parsed.length > 0) {
          validatedAllowlistMarkets = parsed;
          DevLogger.log(
            'PerpsController: HIP-3 allowlistMarkets validated from string',
            { validatedAllowlistMarkets },
          );
        } else {
          DevLogger.log(
            'PerpsController: HIP-3 allowlistMarkets string was empty after parsing',
            { fallbackValue: currentConfig.allowlistMarkets },
          );
        }
      } else if (
        Array.isArray(remoteMarkets) &&
        remoteMarkets.every(
          (item) => typeof item === 'string' && item.length > 0,
        )
      ) {
        // Fallback: Validate array of non-empty strings (in case format changes)
        validatedAllowlistMarkets = (remoteMarkets as string[])
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        DevLogger.log(
          'PerpsController: HIP-3 allowlistMarkets validated from array',
          { validatedAllowlistMarkets },
        );
      } else {
        DevLogger.log(
          'PerpsController: HIP-3 allowlistMarkets validation FAILED - falling back to local config',
          {
            reason: Array.isArray(remoteMarkets)
              ? 'Array contains non-string or empty values'
              : 'Invalid type (expected string or array)',
            fallbackValue: currentConfig.allowlistMarkets,
          },
        );
      }
    }

    // Extract and validate remote HIP-3 blocklist markets (blocklist)
    let validatedBlocklistMarkets: string[] | undefined;
    if (hasProperty(remoteFlags, 'perpsHip3BlocklistMarkets')) {
      const remoteBlocked = remoteFlags.perpsHip3BlocklistMarkets;

      DevLogger.log('PerpsController: HIP-3 blocklistMarkets validation', {
        remoteBlocked,
        type: typeof remoteBlocked,
        isArray: Array.isArray(remoteBlocked),
      });

      // LaunchDarkly returns comma-separated strings for list values
      if (typeof remoteBlocked === 'string') {
        const parsed = parseCommaSeparatedString(remoteBlocked);

        if (parsed.length > 0) {
          validatedBlocklistMarkets = parsed;
          DevLogger.log(
            'PerpsController: HIP-3 blocklistMarkets validated from string',
            { validatedBlocklistMarkets },
          );
        } else {
          DevLogger.log(
            'PerpsController: HIP-3 blocklistMarkets string was empty after parsing',
            { fallbackValue: currentConfig.blocklistMarkets },
          );
        }
      } else if (
        Array.isArray(remoteBlocked) &&
        remoteBlocked.every(
          (item) => typeof item === 'string' && item.length > 0,
        )
      ) {
        // Fallback: Validate array of non-empty strings (in case format changes)
        validatedBlocklistMarkets = (remoteBlocked as string[])
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        DevLogger.log(
          'PerpsController: HIP-3 blocklistMarkets validated from array',
          { validatedBlocklistMarkets },
        );
      } else {
        DevLogger.log(
          'PerpsController: HIP-3 blocklistMarkets validation FAILED - falling back to local config',
          {
            reason: Array.isArray(remoteBlocked)
              ? 'Array contains non-string or empty values'
              : 'Invalid type (expected string or array)',
            fallbackValue: currentConfig.blocklistMarkets,
          },
        );
      }
    }

    // Detect changes (only if we have valid remote values)
    const equityChanged =
      validatedEquity !== undefined &&
      validatedEquity !== currentConfig.enabled;
    const allowlistMarketsChanged =
      validatedAllowlistMarkets !== undefined &&
      JSON.stringify(
        [...validatedAllowlistMarkets].sort((a, b) => a.localeCompare(b)),
      ) !==
        JSON.stringify(
          [...currentConfig.allowlistMarkets].sort((a, b) =>
            a.localeCompare(b),
          ),
        );
    const blocklistMarketsChanged =
      validatedBlocklistMarkets !== undefined &&
      JSON.stringify(
        [...validatedBlocklistMarkets].sort((a, b) => a.localeCompare(b)),
      ) !==
        JSON.stringify(
          [...currentConfig.blocklistMarkets].sort((a, b) =>
            a.localeCompare(b),
          ),
        );

    if (equityChanged || allowlistMarketsChanged || blocklistMarketsChanged) {
      DevLogger.log(
        'PerpsController: HIP-3 config changed via remote feature flags',
        {
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
        },
      );

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

      DevLogger.log(
        'PerpsController: Incremented hip3ConfigVersion to trigger reconnection',
        {
          newVersion,
          newHip3Enabled: validatedEquity ?? currentConfig.enabled,
          newHip3AllowlistMarkets:
            validatedAllowlistMarkets ?? currentConfig.allowlistMarkets,
          newHip3BlocklistMarkets:
            validatedBlocklistMarkets ?? currentConfig.blocklistMarkets,
        },
      );

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
   * @param options.remoteFeatureFlagControllerState - State from RemoteFeatureFlagController
   * @param options.context - ServiceContext providing callbacks
   */
  static refreshEligibility(options: {
    remoteFeatureFlagControllerState: RemoteFeatureFlagControllerState;
    context: ServiceContext;
  }): void {
    const { remoteFeatureFlagControllerState, context } = options;

    const perpsGeoBlockedRegionsFeatureFlag =
      // NOTE: Do not use perpsPerpTradingGeoBlockedCountries as it is deprecated.
      remoteFeatureFlagControllerState.remoteFeatureFlags
        ?.perpsPerpTradingGeoBlockedCountriesV2;

    const remoteBlockedRegions = (
      perpsGeoBlockedRegionsFeatureFlag as { blockedRegions?: string[] }
    )?.blockedRegions;

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
  static setBlockedRegions(options: {
    list: string[];
    source: 'remote' | 'fallback';
    context: ServiceContext;
  }): void {
    const { list, source, context } = options;

    if (
      !context.getBlockedRegionList ||
      !context.setBlockedRegionList ||
      !context.refreshEligibility
    ) {
      throw new Error(
        'Required blocked region callbacks not available in ServiceContext',
      );
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('setBlockedRegions', { source }),
      );
    });
  }
}
