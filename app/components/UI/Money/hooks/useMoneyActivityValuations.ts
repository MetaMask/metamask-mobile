import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { VaultRateResponse } from '@metamask/money-account-api-data-service';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { MINUTE } from '../../../../constants/time';
import type {
  AccountsApiActivity,
  AccountsApiDisplayAmount,
} from '../types/moneyActivity';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import {
  readCachedVaultShareValuations,
  writeCachedVaultShareValuations,
} from '../utils/moneyVaultShareValuationCache';
import {
  cacheEntriesFromResponse,
  getApproximateVaultShareDisplayAmount,
  getHistoricalVaultShareDisplayAmount,
  getVaultShareValuationCacheIdentity,
  isVaultShareCardActivity,
  type VaultShareValuationCacheEntry,
  type VaultShareValuationCacheKey,
} from '../utils/vaultShareValuations';
import type { VaultShareToken } from '../utils/accountsApi';

const MAX_TX_HASHES = 50;
const EMPTY_CACHE: VaultShareValuationCacheEntry[] = [];

interface UseMoneyActivityValuationsOptions {
  pageActivities: readonly (readonly AccountsApiActivity[])[];
  moneyAddress: string;
  vaultShareTokens: readonly VaultShareToken[];
  enabled: boolean;
}

export interface UseMoneyActivityValuationsResult {
  getDisplayAmount: (
    activity: AccountsApiActivity,
  ) => AccountsApiDisplayAmount | undefined;
  isSettling: boolean;
}

function numericChainId(chainId: Hex): number {
  return Number.parseInt(chainId, 16);
}

function cacheKeyForActivity(
  activity: AccountsApiActivity,
  moneyAddress: string,
): VaultShareValuationCacheKey | undefined {
  return activity.blockNumber === undefined
    ? undefined
    : {
        account: moneyAddress.toLowerCase(),
        chainId: numericChainId(activity.chainId),
        vaultAddress: activity.token.address.toLowerCase(),
        txHash: activity.hash.toLowerCase(),
      };
}

function pageCacheEntries(
  activities: readonly AccountsApiActivity[],
  moneyAddress: string,
  cachedEntries: readonly VaultShareValuationCacheEntry[],
): VaultShareValuationCacheEntry[] {
  const identities = new Set(
    activities
      .map((activity) => cacheKeyForActivity(activity, moneyAddress))
      .filter((key): key is VaultShareValuationCacheKey => key !== undefined)
      .map(getVaultShareValuationCacheIdentity),
  );

  return cachedEntries.filter((entry) =>
    identities.has(getVaultShareValuationCacheIdentity(entry)),
  );
}

function chunk<Item>(values: readonly Item[], size: number): Item[][] {
  const chunks: Item[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function useMoneyActivityValuations({
  pageActivities,
  moneyAddress,
  vaultShareTokens,
  enabled,
}: UseMoneyActivityValuationsOptions): UseMoneyActivityValuationsResult {
  const networkTier = useNetworkTier();
  const canFetch = networkTier !== 'NONE';

  const cachedEntries = useMemo(
    () => (enabled ? readCachedVaultShareValuations() : EMPTY_CACHE),
    [enabled],
  );

  const pages = useMemo(
    () =>
      pageActivities.map((activities) => {
        const targets = activities.filter((activity) =>
          isVaultShareCardActivity(activity, vaultShareTokens),
        );
        return {
          activities: targets,
          cached: pageCacheEntries(targets, moneyAddress, cachedEntries),
          targetIdentities: new Set(
            targets
              .map((activity) => cacheKeyForActivity(activity, moneyAddress))
              .filter(
                (key): key is VaultShareValuationCacheKey => key !== undefined,
              )
              .map(getVaultShareValuationCacheIdentity),
          ),
        };
      }),
    [pageActivities, vaultShareTokens, moneyAddress, cachedEntries],
  );

  const valuationQueries = useQueries({
    queries: pages.map((page, pageIndex) => {
      const cachedIdentities = new Set(
        page.cached.map(getVaultShareValuationCacheIdentity),
      );
      const missing = page.activities
        .map((activity) => cacheKeyForActivity(activity, moneyAddress))
        .filter(
          (key): key is VaultShareValuationCacheKey =>
            key !== undefined &&
            !cachedIdentities.has(getVaultShareValuationCacheIdentity(key)),
        );
      const byChain = new Map<number, Set<string>>();
      for (const key of missing) {
        const hashes = byChain.get(key.chainId) ?? new Set<string>();
        hashes.add(key.txHash);
        byChain.set(key.chainId, hashes);
      }
      const chunkCount = [...byChain.values()].reduce(
        (count, hashes) => count + Math.ceil(hashes.size / MAX_TX_HASHES),
        0,
      );

      return {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_SHARE_VALUATIONS,
          moneyAddress.toLowerCase(),
          [...byChain.entries()]
            .map(([chainId, hashes]) => ({
              chainId,
              txHashes: [...hashes].sort(),
            }))
            .sort((a, b) => a.chainId - b.chainId),
        ],
        enabled:
          enabled &&
          moneyAddress !== '' &&
          page.targetIdentities.size > 0 &&
          missing.length > 0 &&
          canFetch,
        initialData: page.cached,
        initialDataUpdatedAt: 0,
        staleTime: 0,
        retry: false,
        queryFn: () =>
          trace(
            {
              name: TraceName.MoneyActivityVaultShareValuationsFetch,
              op: TraceOperation.MoneyAccountDataFetch,
              tags: { page_index: pageIndex },
            },
            async (context) => {
              let requestedCount = 0;
              let entries = readCachedVaultShareValuations();

              for (const [chainId, hashes] of byChain) {
                const configuredVaults = vaultShareTokens.filter(
                  (token) => numericChainId(token.chainId) === chainId,
                );
                const chainIdHex = configuredVaults[0]?.chainId;
                if (!chainIdHex) {
                  continue;
                }

                for (const txHashes of chunk(
                  [...hashes].sort(),
                  MAX_TX_HASHES,
                )) {
                  requestedCount += txHashes.length;
                  const response = await Engine.controllerMessenger.call(
                    'MoneyAccountApiDataService:fetchVaultShareValuations',
                    moneyAddress,
                    {
                      txHashes,
                      chainId,
                    },
                  );
                  const newEntries = cacheEntriesFromResponse({
                    response,
                    account: moneyAddress,
                    chainId: chainIdHex,
                    vaultAddresses: configuredVaults.map(
                      (token) => token.address,
                    ),
                  }).filter((entry) => {
                    const activity = page.activities.find((candidate) => {
                      const key = cacheKeyForActivity(candidate, moneyAddress);
                      return (
                        key !== undefined &&
                        getVaultShareValuationCacheIdentity(key) ===
                          getVaultShareValuationCacheIdentity(entry)
                      );
                    });
                    return (
                      activity !== undefined &&
                      getHistoricalVaultShareDisplayAmount(
                        activity,
                        entry.valuations,
                      ) !== undefined
                    );
                  });
                  if (newEntries.length > 0) {
                    await writeCachedVaultShareValuations(newEntries);
                    entries = [...entries, ...newEntries];
                  }
                }
              }

              annotateTrace(context, {
                requested_count: requestedCount,
                cache_hit_count: page.cached.length,
                chunk_count: chunkCount,
              });
              return pageCacheEntries(page.activities, moneyAddress, entries);
            },
          ),
      } as const;
    }),
  });

  const unresolvedVaultTokens = useMemo(() => {
    const unresolved = new Set<string>();
    for (const page of pages) {
      for (const activity of page.activities) {
        const key = cacheKeyForActivity(activity, moneyAddress);
        const cached = key
          ? page.cached.filter(
              (entry) =>
                getVaultShareValuationCacheIdentity(entry) ===
                getVaultShareValuationCacheIdentity(key),
            )
          : [];
        if (
          !getHistoricalVaultShareDisplayAmount(activity, cached[0]?.valuations)
        ) {
          unresolved.add(
            `${activity.chainId.toLowerCase()}:${activity.token.address.toLowerCase()}`,
          );
        }
      }
    }
    return vaultShareTokens.filter((token) =>
      unresolved.has(
        `${token.chainId.toLowerCase()}:${token.address.toLowerCase()}`,
      ),
    );
  }, [pages, moneyAddress, vaultShareTokens]);

  const rateQueries = useQueries({
    queries: unresolvedVaultTokens.map((token) => ({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_RATE,
        token.address,
        { chainId: numericChainId(token.chainId) },
      ],
      queryFn: (): Promise<VaultRateResponse> =>
        Engine.controllerMessenger.call(
          'MoneyAccountApiDataService:fetchVaultRate',
          token.address,
          { chainId: numericChainId(token.chainId) },
        ),
      enabled: enabled && canFetch,
      staleTime: 5 * MINUTE,
      retry: false,
    })),
  });

  const valuationsByIdentity = useMemo(() => {
    const map = new Map<string, VaultShareValuationCacheEntry>();
    for (const entry of cachedEntries) {
      map.set(getVaultShareValuationCacheIdentity(entry), entry);
    }
    for (const query of valuationQueries) {
      for (const entry of query.data ?? []) {
        map.set(getVaultShareValuationCacheIdentity(entry), entry);
      }
    }
    return map;
  }, [cachedEntries, valuationQueries]);

  const ratesByVault = useMemo(() => {
    const map = new Map<string, VaultRateResponse>();
    unresolvedVaultTokens.forEach((token, index) => {
      const data = rateQueries[index]?.data;
      if (data) {
        map.set(
          `${token.chainId.toLowerCase()}:${token.address.toLowerCase()}`,
          data,
        );
      }
    });
    return map;
  }, [rateQueries, unresolvedVaultTokens]);

  const getDisplayAmount = useCallback(
    (activity: AccountsApiActivity): AccountsApiDisplayAmount | undefined => {
      if (!enabled || !isVaultShareCardActivity(activity, vaultShareTokens)) {
        return undefined;
      }

      const key = cacheKeyForActivity(activity, moneyAddress);
      const historical = key
        ? getHistoricalVaultShareDisplayAmount(
            activity,
            valuationsByIdentity.get(getVaultShareValuationCacheIdentity(key))
              ?.valuations,
          )
        : undefined;
      if (historical) {
        return historical;
      }

      const rate = ratesByVault.get(
        `${activity.chainId.toLowerCase()}:${activity.token.address.toLowerCase()}`,
      );
      return getApproximateVaultShareDisplayAmount(activity, rate?.rate);
    },
    [
      enabled,
      vaultShareTokens,
      moneyAddress,
      valuationsByIdentity,
      ratesByVault,
    ],
  );

  const isSettling =
    enabled &&
    pages.some((page) => page.targetIdentities.size > 0) &&
    (valuationQueries.some((query) => query.isLoading) ||
      rateQueries.some((query) => query.isLoading));

  return { getDisplayAmount, isSettling };
}
