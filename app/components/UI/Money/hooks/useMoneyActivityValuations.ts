import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  VAULT_SHARE_VALUATIONS_MAX_TX_HASHES,
  type VaultRateResponse,
} from '@metamask/money-account-api-data-service';
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
  getVaultShareValuationTarget,
  getVaultShareVaultKey,
  type VaultShareValuationCacheEntry,
  type VaultShareValuationTarget,
} from '../utils/vaultShareValuations';
import type { VaultShareToken } from '../utils/accountsApi';

const EMPTY_CACHE: VaultShareValuationCacheEntry[] = [];

interface ValuationRequest {
  chainId: number;
  chainIdHex: Hex;
  vaultAddresses: Hex[];
  txHashes: string[];
}

interface ValuationBatchResult {
  entries: VaultShareValuationCacheEntry[];
  failed: boolean;
}

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

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function chunk<Item>(values: readonly Item[], size: number): Item[][] {
  const chunks: Item[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function entriesByIdentity(
  entries: readonly VaultShareValuationCacheEntry[],
): Map<string, VaultShareValuationCacheEntry> {
  return new Map(
    entries.map((entry) => [getVaultShareValuationCacheIdentity(entry), entry]),
  );
}

function hasHistoricalValue(
  target: VaultShareValuationTarget,
  entries: ReadonlyMap<string, VaultShareValuationCacheEntry>,
): boolean {
  if (!target.identity) {
    return false;
  }
  return (
    getHistoricalVaultShareDisplayAmount(
      target.activity,
      entries.get(target.identity)?.valuations,
    ) !== undefined
  );
}

function usableEntries(
  targets: readonly VaultShareValuationTarget[],
  entries: readonly VaultShareValuationCacheEntry[],
): VaultShareValuationCacheEntry[] {
  const byIdentity = entriesByIdentity(entries);
  return [...byIdentity.values()].filter((entry) =>
    targets.some(
      (target) =>
        target.identity === getVaultShareValuationCacheIdentity(entry) &&
        hasHistoricalValue(target, byIdentity),
    ),
  );
}

function valuationRequests(
  missing: ReadonlyMap<number, Set<string>>,
  vaultShareTokens: readonly VaultShareToken[],
): ValuationRequest[] {
  const requests: ValuationRequest[] = [];
  for (const [chainId, hashes] of missing) {
    const configuredVaults = vaultShareTokens.filter(
      (token) => numericChainId(token.chainId) === chainId,
    );
    const chainIdHex = configuredVaults[0]?.chainId;
    if (!chainIdHex) {
      continue;
    }
    for (const txHashes of chunk(
      [...hashes].sort(compareStrings),
      VAULT_SHARE_VALUATIONS_MAX_TX_HASHES,
    )) {
      requests.push({
        chainId,
        chainIdHex,
        vaultAddresses: configuredVaults.map((token) => token.address),
        txHashes,
      });
    }
  }
  return requests;
}

async function fetchValuationBatch({
  request,
  moneyAddress,
  targets,
}: {
  request: ValuationRequest;
  moneyAddress: string;
  targets: readonly VaultShareValuationTarget[];
}): Promise<ValuationBatchResult> {
  try {
    const response = await Engine.controllerMessenger.call(
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      moneyAddress,
      { txHashes: request.txHashes, chainId: request.chainId },
    );
    return {
      entries: usableEntries(
        targets,
        cacheEntriesFromResponse({
          response,
          account: moneyAddress,
          chainId: request.chainIdHex,
          vaultAddresses: request.vaultAddresses,
        }),
      ),
      failed: false,
    };
  } catch {
    return { entries: [], failed: true };
  }
}

function missingHashesByChain(
  targets: readonly VaultShareValuationTarget[],
  entries: ReadonlyMap<string, VaultShareValuationCacheEntry>,
): Map<number, Set<string>> {
  const missing = new Map<number, Set<string>>();
  for (const target of targets) {
    if (!target.key || hasHistoricalValue(target, entries)) {
      continue;
    }
    const hashes = missing.get(target.key.chainId) ?? new Set<string>();
    hashes.add(target.key.txHash);
    missing.set(target.key.chainId, hashes);
  }
  return missing;
}

function requestParams(
  missing: ReadonlyMap<number, Set<string>>,
): { chainId: number; txHashes: string[] }[] {
  return [...missing.entries()]
    .map(([chainId, hashes]) => ({
      chainId,
      txHashes: [...hashes].sort(compareStrings),
    }))
    .sort((a, b) => a.chainId - b.chainId);
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
        const targets = activities
          .map((activity) =>
            getVaultShareValuationTarget({
              activity,
              moneyAddress,
              vaultShareTokens,
            }),
          )
          .filter(
            (target): target is VaultShareValuationTarget =>
              target !== undefined,
          );
        const cached = usableEntries(targets, cachedEntries);
        return {
          targets,
          cached,
          cachedByIdentity: entriesByIdentity(cached),
        };
      }),
    [pageActivities, vaultShareTokens, moneyAddress, cachedEntries],
  );

  const combineValuationQueries = useCallback(
    (
      results: {
        data?: VaultShareValuationCacheEntry[];
        isFetching: boolean;
      }[],
    ) => ({
      entries: results.flatMap((result) => result.data ?? []),
      isFetching: results.some((result) => result.isFetching),
    }),
    [],
  );

  const valuationState = useQueries({
    queries: pages.map((page, pageIndex) => {
      const missing = missingHashesByChain(page.targets, page.cachedByIdentity);

      return {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_SHARE_VALUATIONS,
          moneyAddress.toLowerCase(),
          requestParams(missing),
        ],
        enabled:
          enabled &&
          moneyAddress !== '' &&
          page.targets.length > 0 &&
          missing.size > 0 &&
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
              const entries = readCachedVaultShareValuations();
              const requests = valuationRequests(
                missingHashesByChain(page.targets, entriesByIdentity(entries)),
                vaultShareTokens,
              );
              const batches = await Promise.all(
                requests.map((request) =>
                  fetchValuationBatch({
                    request,
                    moneyAddress,
                    targets: page.targets,
                  }),
                ),
              );
              const newEntries = [
                ...entriesByIdentity(
                  batches.flatMap((batch) => batch.entries),
                ).values(),
              ];
              if (newEntries.length > 0) {
                await writeCachedVaultShareValuations(newEntries);
              }

              annotateTrace(context, {
                requested_count: requests.reduce(
                  (count, request) => count + request.txHashes.length,
                  0,
                ),
                cache_hit_count: page.targets.filter((target) =>
                  hasHistoricalValue(target, page.cachedByIdentity),
                ).length,
                chunk_count: requests.length,
                failed_chunk_count: batches.filter((batch) => batch.failed)
                  .length,
              });
              return usableEntries(page.targets, [...entries, ...newEntries]);
            },
          ),
      } as const;
    }),
    combine: combineValuationQueries,
  });

  const unresolvedVaultTokens = useMemo(() => {
    const unresolved = new Set<string>();
    for (const page of pages) {
      for (const target of page.targets) {
        if (!hasHistoricalValue(target, page.cachedByIdentity)) {
          unresolved.add(target.vaultKey);
        }
      }
    }
    return vaultShareTokens.filter((token) =>
      unresolved.has(getVaultShareVaultKey(token.chainId, token.address)),
    );
  }, [pages, vaultShareTokens]);

  const combineRateQueries = useCallback(
    (
      results: {
        data?: VaultRateResponse;
        isFetching: boolean;
      }[],
    ) => ({
      data: results.flatMap((result) => (result.data ? [result.data] : [])),
      isFetching: results.some((result) => result.isFetching),
    }),
    [],
  );

  const rateState = useQueries({
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
    combine: combineRateQueries,
  });

  const valuationsByIdentity = useMemo(() => {
    const map = entriesByIdentity(cachedEntries);
    for (const entry of valuationState.entries) {
      map.set(getVaultShareValuationCacheIdentity(entry), entry);
    }
    return map;
  }, [cachedEntries, valuationState.entries]);

  const ratesByVault = useMemo(() => {
    const map = new Map<string, VaultRateResponse>();
    unresolvedVaultTokens.forEach((token, index) => {
      const data = rateState.data[index];
      if (data) {
        map.set(getVaultShareVaultKey(token.chainId, token.address), data);
      }
    });
    return map;
  }, [rateState.data, unresolvedVaultTokens]);

  const getDisplayAmount = useCallback(
    (activity: AccountsApiActivity): AccountsApiDisplayAmount | undefined => {
      const target = getVaultShareValuationTarget({
        activity,
        moneyAddress,
        vaultShareTokens,
      });
      if (!enabled || !target) {
        return undefined;
      }

      const historical =
        target.identity === undefined
          ? undefined
          : getHistoricalVaultShareDisplayAmount(
              activity,
              valuationsByIdentity.get(target.identity)?.valuations,
            );
      if (historical) {
        return historical;
      }

      const rate = ratesByVault.get(target.vaultKey);
      if (!rate && rateState.isFetching) {
        return { type: 'pending' };
      }
      return getApproximateVaultShareDisplayAmount(activity, rate?.rate);
    },
    [
      enabled,
      moneyAddress,
      vaultShareTokens,
      valuationsByIdentity,
      ratesByVault,
      rateState.isFetching,
    ],
  );

  const isSettling =
    enabled &&
    pages.some((page) => page.targets.length > 0) &&
    (valuationState.isFetching || rateState.isFetching);

  return { getDisplayAmount, isSettling };
}
