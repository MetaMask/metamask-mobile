/**
 * Feature Flag Utilities
 *
 * Fetches and parses feature flags from the MetaMask remote config API
 * to automatically determine which features are enabled/disabled.
 */

import { execSync } from 'child_process';

const FF_API_URL =
  'https://client-config.api.cx.metamask.io/v1/flags?client=mobile';

/**
 * Feature area mapping - maps flag prefixes to feature areas
 */
const FLAG_TO_FEATURE_MAP: Record<string, string> = {
  perps: 'Perps',
  predict: 'Predict',
  earn: 'Earn',
  card: 'Card',
  galileo: 'Card', // Galileo is Card-related
  ramps: 'Ramps',
  bridge: 'Bridge',
  swap: 'Swaps',
  bitcoin: 'Bitcoin',
  solana: 'Solana',
  tron: 'Tron',
  rewards: 'Rewards',
  aiSocial: 'Social AI',
  assets: 'Assets',
  confirmations: 'Confirmations',
  multichain: 'Multichain',
  staking: 'Staking',
};

export interface FeatureFlagStatus {
  name: string;
  enabled: boolean;
  minimumVersion?: string;
  featureArea?: string;
}

export interface FeatureFlagSummary {
  /** All flags fetched from API */
  allFlags: FeatureFlagStatus[];
  /** Feature areas with ALL flags disabled */
  fullyDisabledAreas: string[];
  /** Feature areas with SOME flags disabled (partial) */
  partiallyDisabledAreas: string[];
  /** Feature areas with all flags enabled */
  fullyEnabledAreas: string[];
  /** Raw disabled flag names */
  disabledFlags: string[];
  /** Disabled flags grouped by feature area */
  disabledByArea: Map<string, string[]>;
}

/**
 * Determines if a flag value indicates "disabled"
 */
function isDisabled(value: unknown): boolean {
  if (value === false) return true;
  if (value === null) return true;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // Check for { enabled: false } pattern
    if ('enabled' in obj && obj.enabled === false) return true;
  }
  return false;
}

/**
 * Maps a flag name to its feature area
 */
function getFeatureArea(flagName: string): string | undefined {
  const lowerName = flagName.toLowerCase();
  for (const [prefix, area] of Object.entries(FLAG_TO_FEATURE_MAP)) {
    if (lowerName.startsWith(prefix.toLowerCase())) {
      return area;
    }
  }
  return undefined;
}

/**
 * Fetches feature flags from the remote API
 */
export function fetchFeatureFlags(): FeatureFlagSummary {
  try {
    console.log('📡 Fetching feature flags from remote API...');

    const result = execSync(`curl -s "${FF_API_URL}"`, {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const flagsArray = JSON.parse(result) as Record<string, unknown>[];

    const allFlags: FeatureFlagStatus[] = [];
    const disabledFlags: string[] = [];
    const disabledByArea = new Map<string, string[]>();
    const enabledByArea = new Map<string, string[]>();

    for (const flagObj of flagsArray) {
      // Each element is an object with one key-value pair
      const entries = Object.entries(flagObj);
      if (entries.length === 0) continue;

      const [name, value] = entries[0];
      const disabled = isDisabled(value);
      const featureArea = getFeatureArea(name);

      // Extract minimum version if present
      let minimumVersion: string | undefined;
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if (typeof obj.minimumVersion === 'string') {
          minimumVersion = obj.minimumVersion;
        }
      }

      allFlags.push({
        name,
        enabled: !disabled,
        minimumVersion,
        featureArea,
      });

      if (featureArea) {
        if (disabled) {
          disabledFlags.push(name);
          const existing = disabledByArea.get(featureArea) || [];
          existing.push(name);
          disabledByArea.set(featureArea, existing);
        } else {
          const existing = enabledByArea.get(featureArea) || [];
          existing.push(name);
          enabledByArea.set(featureArea, existing);
        }
      } else if (disabled) {
        disabledFlags.push(name);
      }
    }

    // Categorize areas by their flag status
    const fullyDisabledAreas: string[] = [];
    const partiallyDisabledAreas: string[] = [];
    const fullyEnabledAreas: string[] = [];

    const allAreas = new Set([
      ...disabledByArea.keys(),
      ...enabledByArea.keys(),
    ]);
    for (const area of allAreas) {
      const disabledCount = disabledByArea.get(area)?.length || 0;
      const enabledCount = enabledByArea.get(area)?.length || 0;

      if (disabledCount > 0 && enabledCount === 0) {
        fullyDisabledAreas.push(area);
      } else if (disabledCount > 0 && enabledCount > 0) {
        partiallyDisabledAreas.push(area);
      } else {
        fullyEnabledAreas.push(area);
      }
    }

    console.log(`   ✓ Fetched ${allFlags.length} flags`);
    console.log(`   ✓ ${disabledFlags.length} disabled flags`);
    console.log(
      `   ✓ ${fullyDisabledAreas.length} fully disabled, ${partiallyDisabledAreas.length} partially disabled`,
    );

    return {
      allFlags,
      fullyDisabledAreas,
      partiallyDisabledAreas,
      fullyEnabledAreas,
      disabledFlags,
      disabledByArea,
    };
  } catch (error) {
    console.warn('   ⚠ Could not fetch feature flags:', error);
    return {
      allFlags: [],
      fullyDisabledAreas: [],
      partiallyDisabledAreas: [],
      fullyEnabledAreas: [],
      disabledFlags: [],
      disabledByArea: new Map(),
    };
  }
}

/**
 * Formats feature flag summary for display
 */
export function formatFeatureFlagSummary(summary: FeatureFlagSummary): string {
  const lines: string[] = [];

  lines.push('📊 FEATURE FLAG STATUS');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (summary.fullyDisabledAreas.length > 0) {
    lines.push('');
    lines.push('🔴 Fully disabled (all flags off):');
    for (const area of summary.fullyDisabledAreas) {
      lines.push(`   • ${area}`);
    }
  }

  if (summary.partiallyDisabledAreas.length > 0) {
    lines.push('');
    lines.push(
      '🟡 Partially disabled (some flags off - new features behind FF):',
    );
    for (const area of summary.partiallyDisabledAreas) {
      const disabledFlags = summary.disabledByArea.get(area) || [];
      lines.push(`   • ${area} (${disabledFlags.length} disabled flags)`);
      // Show first 3 disabled flags as examples
      for (const flag of disabledFlags.slice(0, 3)) {
        lines.push(`     - ${flag}`);
      }
      if (disabledFlags.length > 3) {
        lines.push(`     ... and ${disabledFlags.length - 3} more`);
      }
    }
  }

  if (summary.fullyEnabledAreas.length > 0) {
    lines.push('');
    lines.push('🟢 Fully enabled:');
    for (const area of summary.fullyEnabledAreas.slice(0, 10)) {
      lines.push(`   • ${area}`);
    }
    if (summary.fullyEnabledAreas.length > 10) {
      lines.push(`   ... and ${summary.fullyEnabledAreas.length - 10} more`);
    }
  }

  return lines.join('\n');
}
