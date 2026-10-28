import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  isCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import type { PendingTokenMetadata } from '@metamask/assets-controller';
import BigNumber from 'bignumber.js';
import { apiClient } from '../../../../../../core/apiClient';
import Engine from '../../../../../../core/Engine';
import NotificationManager from '../../../../../../core/NotificationManager';
import { strings } from '../../../../../../../locales/i18n';
import { endTrace, trace, TraceName } from '../../../../../../util/trace';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../../selectors/currencyRateController';
import { selectEnabledNetworks } from '../../../../../../selectors/networkEnablementController';
import {
  selectSelectedAccountGroupId,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../../../selectors/multichainAccounts/accountTreeController';
import {
  getAssetPreferences,
  getAssetsBalance,
  getAssetsInfo,
  getCustomAssets,
} from '../../../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../../../selectors/multichain/multichain';
import useAssetVisibility from '../../../../../UI/TokenDetails/components/useAssetVisibility';
import { buildOwnedTokenAccountTargets } from '../model/accountTargets';
import { classifyOwnedTokenBalances } from '../model/classifyOwnedTokens';
import { fetchOwnedTokenBalancesInChunks } from '../model/fetchOwnedTokenBalances';
import { fiatMultiplierFromRates } from '../model/formatOwnedToken';
import { resolveOwnedTokenQuoteCurrency } from '../model/supportedVsCurrency';
import type { ClassifiedHolding, OwnedTokenAccount } from '../model/types';

const STALE_TIME_MS = 60_000;

export type OwnedTokensStatus = 'pending' | 'error' | 'success' | 'offline';

export interface OwnedTokensImportResult {
  successCount: number;
  failureCount: number;
  failedKeys: string[];
  hiddenCount: number;
  undetectedCount: number;
}

export interface UseOwnedTokensOptions {
  /** Unknown hardware stays on the product path. `LOW` serializes chunks. */
  hardwareTier: 'LOW' | 'MID' | 'HIGH' | null;
  /**
   * `NONE` skips the network request. `null` is unknown and still fetches.
   * `SLOW_CELLULAR` serializes chunks.
   */
  networkTier: 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null;
}

const ownedTokensQueryKey = (
  accountGroupId: string | null,
  chainIds: readonly string[],
  vsCurrency: string,
) => ['owned-tokens', accountGroupId, chainIds, vsCurrency] as const;

export const useOwnedTokens = ({
  hardwareTier,
  networkTier,
}: UseOwnedTokensOptions) => {
  const queryClient = useQueryClient();
  const { handleAddCustomAsset } = useAssetVisibility();
  const accountGroupId = useSelector(selectSelectedAccountGroupId);
  const accounts = useSelector(selectSelectedAccountGroupInternalAccounts);
  const enabledChainIds = useSelector(selectEnabledNetworks);
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const assetsInfo = useSelector(getAssetsInfo);
  const customAssets = useSelector(getCustomAssets);
  const assetsBalance = useSelector(getAssetsBalance);
  const assetPreferences = useSelector(getAssetPreferences);
  const ignoredAssetsByAccount = useSelector(
    selectMultichainAssetsAllIgnoredAssets,
  );
  const [removedKeys, setRemovedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isAdding, setIsAdding] = useState(false);

  const quote = useMemo(
    () => resolveOwnedTokenQuoteCurrency(selectedCurrency),
    [selectedCurrency],
  );

  const targets = useMemo(() => {
    const groupAccounts: OwnedTokenAccount[] = accounts.map((account) => ({
      id: account.id,
      address: account.address,
      scopes: account.scopes,
      name: account.metadata?.name ?? '',
    }));
    return buildOwnedTokenAccountTargets(groupAccounts, enabledChainIds);
  }, [accounts, enabledChainIds]);

  const targetsByAccountId = useMemo(
    () => new Map(targets.map((target) => [target.caipAccountId, target])),
    [targets],
  );

  const chainIds = useMemo(
    () => [...new Set(targets.map((target) => target.chainId))].sort(),
    [targets],
  );

  const fetchEnabled =
    networkTier !== 'NONE' && targets.length > 0 && Boolean(accountGroupId);
  const sequential = networkTier === 'SLOW_CELLULAR' || hardwareTier === 'LOW';

  const ethRates = currencyRates?.ETH;
  const fiatMultiplier = useMemo(
    () =>
      fiatMultiplierFromRates(
        quote.needsUsdConversion,
        ethRates?.conversionRate ?? undefined,
        ethRates?.usdConversionRate ?? undefined,
      ),
    [
      ethRates?.conversionRate,
      ethRates?.usdConversionRate,
      quote.needsUsdConversion,
    ],
  );

  const query = useQuery({
    queryKey: ownedTokensQueryKey(accountGroupId, chainIds, quote.vsCurrency),
    enabled: fetchEnabled,
    staleTime: STALE_TIME_MS,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    queryFn: ({ signal }) =>
      fetchOwnedTokenBalancesInChunks({
        accountIds: targets.map((target) => target.caipAccountId),
        vsCurrency: quote.vsCurrency,
        signal,
        sequential,
        fetchChunk: async (ids, networks, currency, requestSignal) => {
          const options =
            apiClient.accounts.getV6MultiAccountBalancesQueryOptions([...ids], {
              filterSupportedTokens: false,
              includeDeFiBalances: false,
              includePrices: true,
              includeLabels: true,
              includeCanonicalHead: true,
              vsCurrency: currency,
              networks: [...networks],
            });
          const { queryFn } = options;
          if (typeof queryFn !== 'function') {
            throw new Error('Owned token balance query has no query function');
          }
          return queryFn({
            signal: requestSignal,
            queryKey: options.queryKey,
            meta: undefined,
            client: apiClient.accounts.queryClient,
          });
        },
      }),
  });

  const tokens = useMemo(() => {
    const classified = classifyOwnedTokenBalances({
      balances: query.data?.balances ?? [],
      targetsByAccountId,
      wallet: {
        assetsInfo,
        customAssets,
        assetsBalance,
        assetPreferences,
        ignoredAssetsByAccount,
      },
      fiatMultiplier,
    });
    return classified.filter((row) => !removedKeys.has(row.rowKey));
  }, [
    assetPreferences,
    assetsBalance,
    assetsInfo,
    customAssets,
    fiatMultiplier,
    ignoredAssetsByAccount,
    query.data?.balances,
    removedKeys,
    targetsByAccountId,
  ]);

  const addTokens = useCallback(
    async (
      selected: readonly ClassifiedHolding[],
    ): Promise<OwnedTokensImportResult> => {
      trace({ name: TraceName.ImportTokens });
      setIsAdding(true);
      try {
        const settled = await Promise.allSettled(
          selected.map(async (row) => {
            if (row.category === 'hidden') {
              const assetId = row.unhideAssetId ?? row.assetId;
              if (!isCaipAssetType(assetId)) {
                throw new Error('Owned token asset id is not a CAIP-19 id');
              }
              await Engine.context.AssetsController.unhideAsset(assetId);
              return;
            }
            await handleAddCustomAsset(
              row.assetId as CaipAssetType,
              {
                address: row.assetReference,
                symbol: row.symbol,
                name: row.name,
                decimals: row.decimals,
                chainId: row.chainId as CaipChainId,
              } as PendingTokenMetadata,
              row.internalAccountId,
            );
          }),
        );
        const failed = selected.filter(
          (_row, index) => settled[index]?.status === 'rejected',
        );
        const succeeded = selected.filter(
          (_row, index) => settled[index]?.status === 'fulfilled',
        );
        if (succeeded.length > 0) {
          setRemovedKeys((current) => {
            const next = new Set(current);
            succeeded.forEach((row) => next.add(row.rowKey));
            return next;
          });
          await queryClient.invalidateQueries({
            queryKey: ['owned-tokens', accountGroupId],
          });
        }
        const successCount = succeeded.length;
        const failureCount = failed.length;
        const description =
          failureCount === 0
            ? strings('add_asset.owned_tokens.toast_success', {
                count: successCount,
              })
            : successCount === 0
              ? strings('add_asset.owned_tokens.toast_failure', {
                  count: failureCount,
                })
              : strings('add_asset.owned_tokens.toast_mixed', {
                  successCount,
                  failureCount,
                });
        NotificationManager.showSimpleNotification({
          status: failureCount === 0 ? 'success' : 'error',
          duration: 5000,
          title: strings('add_asset.owned_tokens.toast_title'),
          description,
        });
        const countCategory = (
          rows: readonly ClassifiedHolding[],
          category: ClassifiedHolding['category'],
        ) => rows.filter((row) => row.category === category).length;
        return {
          successCount,
          failureCount,
          failedKeys: failed.map((row) => row.rowKey),
          hiddenCount: countCategory(succeeded, 'hidden'),
          undetectedCount: countCategory(succeeded, 'undetected'),
        };
      } finally {
        setIsAdding(false);
        endTrace({ name: TraceName.ImportTokens });
      }
    },
    [accountGroupId, handleAddCustomAsset, queryClient],
  );

  let status: OwnedTokensStatus = 'pending';
  if (!fetchEnabled && networkTier === 'NONE') {
    status = 'offline';
  } else if (query.isError) {
    status = 'error';
  } else if (query.isSuccess || !fetchEnabled) {
    status = 'success';
  }

  return {
    tokens,
    status,
    unprocessedNetworks: query.data?.unprocessedNetworks ?? [],
    refetch: query.refetch,
    addTokens,
    isAdding,
    vsCurrency: quote.vsCurrency,
    fiatMultiplier: fiatMultiplier ?? new BigNumber(1),
  };
};
