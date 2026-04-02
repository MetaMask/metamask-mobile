import {
  buildProviderCacheKey,
  PROVIDER_CONFIG,
} from '../constants/perpsConfig';
import type { AccountState, Order, PerpsMarketData, Position } from '../types';

/** Shape of a single market entry persisted to disk cache. */
export type DiskCacheMarketEntry = {
  providerNetworkKey: string;
  data: PerpsMarketData[];
  timestamp: number;
};

/** Shape of a single user-data entry persisted to disk cache. */
export type DiskCacheUserEntry = {
  providerNetworkKey: string;
  address: string;
  positions: Position[];
  orders: Order[];
  accountState: AccountState | null;
  timestamp: number;
};

/** Disk payload shape — either a single entry or a multi-provider wrapper. */
export type DiskCacheMarketPayload =
  | DiskCacheMarketEntry
  | { entries: DiskCacheMarketEntry[] };

export type DiskCacheUserPayload =
  | DiskCacheUserEntry
  | { entries: DiskCacheUserEntry[] };

/**
 * Build the disk-cache payload for market data.
 * In aggregated mode, groups markets by provider into separate entries.
 *
 * @param markets - Current market data snapshot.
 * @param activeProvider - The active provider id (may be "aggregated").
 * @param isTestnet - Global testnet flag.
 * @param now - Timestamp to stamp entries with.
 * @returns Payload ready for JSON serialization.
 */
export function buildMarketDataPayload(
  markets: PerpsMarketData[],
  activeProvider: string,
  isTestnet: boolean,
  now: number,
): DiskCacheMarketPayload {
  if (activeProvider === 'aggregated') {
    const entriesByKey = new Map<string, DiskCacheMarketEntry>();
    for (const market of markets) {
      const providerId = market.providerId ?? PROVIDER_CONFIG.DefaultProvider;
      const key = buildProviderCacheKey(providerId, isTestnet);
      const existing = entriesByKey.get(key);
      if (existing) {
        existing.data.push(market);
      } else {
        entriesByKey.set(key, {
          providerNetworkKey: key,
          data: [market],
          timestamp: now,
        });
      }
    }
    const entries = Array.from(entriesByKey.values());
    return entries.length === 1 ? entries[0] : { entries };
  }
  return {
    providerNetworkKey: buildProviderCacheKey(
      activeProvider ?? PROVIDER_CONFIG.DefaultProvider,
      isTestnet,
    ),
    data: markets,
    timestamp: now,
  };
}

/**
 * Build the disk-cache payload for user data (positions, orders, account).
 * In aggregated mode, groups entries by provider.
 *
 * @param positions - Current positions snapshot.
 * @param orders - Current orders snapshot.
 * @param accountState - Current account state snapshot.
 * @param address - EVM account address.
 * @param activeProvider - The active provider id (may be "aggregated").
 * @param isTestnet - Global testnet flag.
 * @param now - Timestamp to stamp entries with.
 * @returns Payload ready for JSON serialization.
 */
export function buildUserDataPayload(
  positions: Position[],
  orders: Order[],
  accountState: AccountState | null,
  address: string,
  activeProvider: string,
  isTestnet: boolean,
  now: number,
): DiskCacheUserPayload {
  if (activeProvider === 'aggregated') {
    const entriesByKey = new Map<string, DiskCacheUserEntry>();
    const ensureEntry = (providerId: string): DiskCacheUserEntry => {
      const key = buildProviderCacheKey(providerId, isTestnet);
      let entry = entriesByKey.get(key);
      if (!entry) {
        entry = {
          providerNetworkKey: key,
          address,
          positions: [],
          orders: [],
          accountState: null,
          timestamp: now,
        };
        entriesByKey.set(key, entry);
      }
      return entry;
    };

    for (const position of positions) {
      ensureEntry(
        position.providerId ?? PROVIDER_CONFIG.DefaultProvider,
      ).positions.push(position);
    }
    for (const order of orders) {
      ensureEntry(
        order.providerId ?? PROVIDER_CONFIG.DefaultProvider,
      ).orders.push(order);
    }
    if (accountState) {
      ensureEntry(
        accountState.providerId ?? PROVIDER_CONFIG.DefaultProvider,
      ).accountState = accountState;
    }

    const entries = Array.from(entriesByKey.values()).filter(
      (entry) =>
        entry.positions.length > 0 ||
        entry.orders.length > 0 ||
        entry.accountState !== null,
    );
    return entries.length === 1 ? entries[0] : { entries };
  }
  return {
    providerNetworkKey: buildProviderCacheKey(
      activeProvider ?? PROVIDER_CONFIG.DefaultProvider,
      isTestnet,
    ),
    address,
    positions,
    orders,
    accountState,
    timestamp: now,
  };
}
