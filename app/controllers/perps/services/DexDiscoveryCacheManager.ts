import {
  MAINNET_HIP3_CONFIG,
  TESTNET_HIP3_CONFIG,
} from '../constants/hyperLiquidConfig';
import type { DexDiscoveryState, ExtendedPerpDex } from '../types/perps-types';

type DexDiscoveryDeps = {
  isTestnetMode: () => boolean;
  debugLogger: { log: (...args: unknown[]) => void };
  getAllowlistMarkets: () => string[];
};

/**
 * Manages the unified DEX discovery cache — single source of truth for all perpDexs() derivatives.
 *
 * Extracted from HyperLiquidProvider to isolate cache logic.
 * All writes go through update(); readers use .state.
 */
export class DexDiscoveryCacheManager {
  /**
   * Unified DEX discovery state.
   * null = not yet fetched; object = raw + validated + timestamp.
   */
  state: DexDiscoveryState | null = null;

  readonly #deps: DexDiscoveryDeps;

  constructor(deps: DexDiscoveryDeps) {
    this.#deps = deps;
  }

  /**
   * Single atomic writer for DEX discovery state.
   * All code paths that fetch perpDexs() MUST call this — no direct field writes.
   *
   * @param allDexs - Raw perpDexs() API response array.
   * @returns The newly created unified discovery state.
   */
  update(allDexs: (ExtendedPerpDex | null)[]): DexDiscoveryState {
    const validated = this.computeValidatedDexs(allDexs);
    const newState: DexDiscoveryState = {
      raw: allDexs,
      validated,
      timestamp: Date.now(),
    };
    this.state = newState;
    return newState;
  }

  /**
   * Reset state to null (used on disconnect/reconnect).
   */
  reset(): void {
    this.state = null;
  }

  /**
   * Pure filtering of perpDexs() response into validated DEX names.
   * Encapsulates testnet/mainnet feature-flag logic.
   *
   * @param allDexs - Raw perpDexs() API response array.
   * @returns Filtered DEX name list (null = main DEX, strings = HIP-3 DEXs).
   */
  computeValidatedDexs(allDexs: (ExtendedPerpDex | null)[]): (string | null)[] {
    const availableHip3Dexs: string[] = [];
    allDexs.forEach((dex) => {
      if (dex !== null) {
        availableHip3Dexs.push(dex.name);
      }
    });

    if (this.#deps.isTestnetMode()) {
      const { EnabledDexs, AutoDiscoverAll } = TESTNET_HIP3_CONFIG;

      if (!AutoDiscoverAll) {
        if (EnabledDexs.length === 0) {
          this.#deps.debugLogger.log(
            'HyperLiquidProvider: Testnet - using main DEX only (HIP-3 DEXs filtered)',
            {
              availableHip3Dexs: availableHip3Dexs.length,
              reason: 'TESTNET_HIP3_CONFIG.EnabledDexs is empty',
            },
          );
          return [null];
        }

        const filteredDexs = availableHip3Dexs.filter((dex) =>
          EnabledDexs.includes(dex),
        );
        this.#deps.debugLogger.log(
          'HyperLiquidProvider: Testnet - filtered to allowed DEXs',
          {
            allowedDexs: EnabledDexs,
            filteredDexs,
            availableHip3Dexs: availableHip3Dexs.length,
          },
        );
        return [null, ...filteredDexs];
      }

      this.#deps.debugLogger.log(
        'HyperLiquidProvider: Testnet - AUTO_DISCOVER_ALL enabled, using all DEXs',
        { totalDexCount: availableHip3Dexs.length + 1 },
      );
    } else {
      const { AutoDiscoverAll } = MAINNET_HIP3_CONFIG;

      if (!AutoDiscoverAll) {
        const allowedDexsFromAllowlist = this.extractDexsFromAllowlist();

        if (allowedDexsFromAllowlist.length === 0) {
          this.#deps.debugLogger.log(
            'HyperLiquidProvider: Mainnet - using main DEX only (no HIP-3 DEXs in allowlist)',
            {
              availableHip3Dexs: availableHip3Dexs.length,
              allowlistMarkets: this.#deps.getAllowlistMarkets(),
            },
          );
          return [null];
        }

        const filteredDexs = availableHip3Dexs.filter((dex) =>
          allowedDexsFromAllowlist.includes(dex),
        );
        this.#deps.debugLogger.log(
          'HyperLiquidProvider: Mainnet - filtered to allowlist DEXs',
          {
            allowedDexsFromAllowlist,
            filteredDexs,
            availableHip3Dexs: availableHip3Dexs.length,
          },
        );
        return [null, ...filteredDexs];
      }

      this.#deps.debugLogger.log(
        'HyperLiquidProvider: Mainnet - AUTO_DISCOVER_ALL enabled, using all DEXs',
        { totalDexCount: availableHip3Dexs.length + 1 },
      );
    }

    this.#deps.debugLogger.log(
      'HyperLiquidProvider: All DEXs enabled (market filtering at data layer)',
      {
        mainDex: true,
        hip3Dexs: availableHip3Dexs,
        totalDexCount: availableHip3Dexs.length + 1,
      },
    );
    return [null, ...availableHip3Dexs];
  }

  /**
   * Extract unique DEX names from allowlist market patterns.
   * Patterns can be: "xyz:*" (wildcard), "xyz:TSLA" (exact), or "xyz" (DEX shorthand).
   *
   * @returns Array of unique DEX names from the allowlist.
   */
  extractDexsFromAllowlist(): string[] {
    const allowlistMarkets = this.#deps.getAllowlistMarkets();
    if (allowlistMarkets.length === 0) {
      return [];
    }

    const dexNames = new Set<string>();

    for (const pattern of allowlistMarkets) {
      const colonIndex = pattern.indexOf(':');
      if (colonIndex > 0) {
        const dex = pattern.substring(0, colonIndex);
        dexNames.add(dex);
      } else if (pattern.length > 0 && !pattern.includes('*')) {
        if (/^[a-z][a-z0-9]*$/iu.test(pattern)) {
          dexNames.add(pattern.toLowerCase());
        }
      }
    }

    return Array.from(dexNames);
  }
}
