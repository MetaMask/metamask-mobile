import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { chunk } from 'lodash';
import {
  VAULT_SHARE_VALUATIONS_MAX_TX_HASHES,
  type VaultRateResponse,
} from '@metamask/money-account-api-data-service';
import { hexToNumber, type Hex } from '@metamask/utils';
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
  entriesByIdentity,
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

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
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
  params: readonly ValuationRequestParams[],
  vaultShareTokens: readonly VaultShareToken[],
): ValuationRequest[] {
  const requests: ValuationRequest[] = [];
  for (const { chainId, txHashes, vaultKeys } of params) {
    const configuredVaults = vaultShareTokens.filter(
      (token) =>
        hexToNumber(token.chainId) === chainId &&
        vaultKeys.includes(getVaultShareVaultKey(token.chainId, token.address)),
    );
    const chainIdHex = configuredVaults[0]?.chainId;
    if (!chainIdHex) {
      continue;
    }
    const vaultAddresses = [
      ...new Map(
        configuredVaults.map((token) => [
          token.address.toLowerCase(),
          token.address,
        ]),
      ).values(),
    ];
    for (const chunkHashes of chunk(
      [...txHashes].sort(compareStrings),
      VAULT_SHARE_VALUATIONS_MAX_TX_HASHES,
    )) {
      requests.push({
        chainId,
        chainIdHex,
        vaultAddresses,
        txHashes: chunkHashes,
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

interface ValuationRequestParams {
  chainId: number;
  txHashes: string[];
  vaultKeys: string[];
}

function vaultKeysByChain(
  targets: readonly VaultShareValuationTarget[],
): Map<number, Set<string>> {
  const keysByChain = new Map<number, Set<string>>();
  for (const target of targets) {
    const chainId = hexToNumber(target.activity.chainId);
    const keys = keysByChain.get(chainId) ?? new Set<string>();
    keys.add(target.vaultKey);
    keysByChain.set(chainId, keys);
  }
  return keysByChain;
}

function requestParams(
  missing: ReadonlyMap<number, Set<string>>,
  targets: readonly VaultShareValuationTarget[],
): ValuationRequestParams[] {
  const keysByChain = vaultKeysByChain(targets);
  return [...missing.entries()]
    .map(([chainId, hashes]) => ({
      chainId,
      txHashes: [...hashes].sort(compareStrings),
      vaultKeys: [...(keysByChain.get(chainId) ?? [])].sort(compareStrings),
    }))
    .sort((a, b) => a.chainId - b.chainId);
}

interface ValuationQueryGroup {
  params: ValuationRequestParams[];
  targets: VaultShareValuationTarget[];
  pageIndices: number[];
}

function getTargetIdentity(target: VaultShareValuationTarget): string {
  return JSON.stringify([
    target.identity ?? target.vaultKey,
    target.activity.hash.toLowerCase(),
    target.activity.kind,
    target.activity.blockNumber ?? null,
    target.activity.amount,
  ]);
}

function mergeValuationTargets(
  existingTargets: readonly VaultShareValuationTarget[],
  newTargets: readonly VaultShareValuationTarget[],
): VaultShareValuationTarget[] {
  const targetsByIdentity = new Map<string, VaultShareValuationTarget>();
  for (const target of [...existingTargets, ...newTargets]) {
    targetsByIdentity.set(getTargetIdentity(target), target);
  }
  return [...targetsByIdentity.values()];
}

function mergeRequestParams(
  existingParams: readonly ValuationRequestParams[],
  newParams: readonly ValuationRequestParams[],
): ValuationRequestParams[] {
  const paramsByChain = new Map<
    number,
    { txHashes: Set<string>; vaultKeys: Set<string> }
  >();

  for (const params of [...existingParams, ...newParams]) {
    const current = paramsByChain.get(params.chainId) ?? {
      txHashes: new Set<string>(),
      vaultKeys: new Set<string>(),
    };
    params.txHashes.forEach((hash) => current.txHashes.add(hash));
    params.vaultKeys.forEach((vaultKey) => current.vaultKeys.add(vaultKey));
    paramsByChain.set(params.chainId, current);
  }

  return [...paramsByChain.entries()]
    .map(([chainId, params]) => ({
      chainId,
      txHashes: [...params.txHashes].sort(compareStrings),
      vaultKeys: [...params.vaultKeys].sort(compareStrings),
    }))
    .sort((a, b) => a.chainId - b.chainId);
}

function mergeValuationQueryGroups(
  existingGroup: ValuationQueryGroup,
  newGroup: ValuationQueryGroup,
): ValuationQueryGroup {
  return {
    params: mergeRequestParams(existingGroup.params, newGroup.params),
    targets: mergeValuationTargets(existingGroup.targets, newGroup.targets),
    pageIndices: [
      ...new Set([...existingGroup.pageIndices, ...newGroup.pageIndices]),
    ].sort((a, b) => a - b),
  };
}

function buildValuationQueryGroups(
  pages: readonly {
    targets: VaultShareValuationTarget[];
    cached: VaultShareValuationCacheEntry[];
    cachedByIdentity: Map<string, VaultShareValuationCacheEntry>;
  }[],
): ValuationQueryGroup[] {
  const groups: ValuationQueryGroup[] = [];
  const groupIndexByRequestHashes = new Map<string, number>();

  pages.forEach((page, pageIndex) => {
    const missing = missingHashesByChain(page.targets, page.cachedByIdentity);
    if (missing.size === 0) {
      return;
    }

    const pageGroup: ValuationQueryGroup = {
      params: requestParams(missing, page.targets),
      targets: page.targets,
      pageIndices: [pageIndex],
    };
    const groupKey = JSON.stringify(
      pageGroup.params.map(({ chainId, txHashes }) => ({
        chainId,
        txHashes,
      })),
    );
    const existingGroupIndex = groupIndexByRequestHashes.get(groupKey);
    if (existingGroupIndex === undefined) {
      groupIndexByRequestHashes.set(groupKey, groups.length);
      groups.push(pageGroup);
      return;
    }
    groups[existingGroupIndex] = mergeValuationQueryGroups(
      groups[existingGroupIndex],
      pageGroup,
    );
  });

  return groups;
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

  const valuationQueryGroups = useMemo(
    () => buildValuationQueryGroups(pages),
    [pages],
  );

  const valuationQueries = valuationQueryGroups.map(
    (group) =>
      ({
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_SHARE_VALUATIONS,
          moneyAddress.toLowerCase(),
          group.params,
          group.targets.map(getTargetIdentity).sort(compareStrings),
        ],
        enabled: enabled && moneyAddress !== '' && canFetch,
        initialData: () =>
          usableEntries(group.targets, readCachedVaultShareValuations()),
        initialDataUpdatedAt: 0,
        staleTime: 0,
        retry: false,
        queryFn: async () =>
          trace(
            {
              name: TraceName.MoneyActivityVaultShareValuationsFetch,
              op: TraceOperation.MoneyAccountDataFetch,
              tags: { page_indices: group.pageIndices.join(',') },
            },
            async (context) => {
              const entries = readCachedVaultShareValuations();
              const entriesByCacheIdentity = entriesByIdentity(entries);
              const cacheHitCount = group.targets.filter((target) =>
                hasHistoricalValue(target, entriesByCacheIdentity),
              ).length;
              const requests = valuationRequests(
                requestParams(
                  missingHashesByChain(group.targets, entriesByCacheIdentity),
                  group.targets,
                ),
                vaultShareTokens,
              );
              const batches = await Promise.all(
                requests.map(async (request) =>
                  fetchValuationBatch({
                    request,
                    moneyAddress,
                    targets: group.targets,
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
                cache_hit_count: cacheHitCount,
                chunk_count: requests.length,
                failed_chunk_count: batches.filter((batch) => batch.failed)
                  .length,
              });
              return usableEntries(group.targets, [...entries, ...newEntries]);
            },
          ),
      }) as const,
  );

  const valuationState = useQueries({
    queries: valuationQueries,
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
    const seen = new Set<string>();
    return vaultShareTokens.filter((token) => {
      const vaultKey = getVaultShareVaultKey(token.chainId, token.address);
      if (!unresolved.has(vaultKey) || seen.has(vaultKey)) {
        return false;
      }
      seen.add(vaultKey);
      return true;
    });
  }, [pages, vaultShareTokens]);

  const combineRateQueries = useCallback(
    (
      results: {
        data?: VaultRateResponse;
        isFetching: boolean;
      }[],
    ) => ({
      data: results.map((result) => result.data),
      isFetching: results.some((result) => result.isFetching),
    }),
    [],
  );

  const rateQueries = unresolvedVaultTokens.map((token) => ({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_RATE,
      token.address,
      { chainId: hexToNumber(token.chainId) },
    ],
    queryFn: async (): Promise<VaultRateResponse> =>
      Engine.controllerMessenger.call(
        'MoneyAccountApiDataService:fetchVaultRate',
        token.address,
        { chainId: hexToNumber(token.chainId) },
      ),
    enabled: enabled && canFetch,
    staleTime: 5 * MINUTE,
    retry: false,
  }));

  const rateState = useQueries({
    queries: rateQueries,
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
