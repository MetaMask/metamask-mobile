import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { EthAccountType } from '@metamask/keyring-api';
import type { AccountGroupId } from '@metamask/account-api';
import { getNetworkBadgeSource } from '../../utils/network';
import { AssetType, TokenStandard } from '../../types/token';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import type { RootState } from '../../../../../reducers';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import {
  AssetFiatFormatter,
  useAssetFiatFormatter,
} from '../pay/useAssetFiatFormatter';
import { hasBalance, selectAccountGroupAssets } from '../../selectors/assets';
import { useAccountOverrideGroupId } from './useAccountOverrideGroupId';
import { useEnsureAccountGroupAssets } from './useEnsureAccountGroupAssets';

export interface EnrichTokenRequest {
  chainId: Hex;
  address: string;
}

export type DecoratedAsset = AssetType & {
  /**
   * Whether the asset was eligible for an EVM fiat rate lookup. Computed once
   * during decoration and carried on the asset so neither the rate-consumption
   * walk nor `deriveAssetFiat` has to re-derive it.
   */
  isEvmRateEligible: boolean;
  key: string;
  sortKey: number;
};

const EMPTY_REQUESTS: EnrichTokenRequest[] = [];

export function useAccountTokens({
  includeNoBalance = false,
  tokenFilter,
  enrichTokenRequests = EMPTY_REQUESTS,
}: {
  includeNoBalance?: boolean;
  tokenFilter?: (chainId: string, address: string) => boolean;
  enrichTokenRequests?: EnrichTokenRequest[];
} = {}): AssetType[] {
  const accountOverride = useTransactionAccountOverride();
  const overrideGroupId = useAccountOverrideGroupId();

  // Assets are only fetched automatically for the selected account group, so an
  // override account the user has never activated has no entry in assets state.
  // Request it on demand, otherwise the token list stays permanently empty.
  useEnsureAccountGroupAssets(overrideGroupId);

  // When an account override is active, always use its assets (even if empty)
  // to avoid showing stale tokens from the globally selected account.
  const accountGroupId =
    accountOverride === undefined ? undefined : overrideGroupId;

  const { format: formatFiat } = useAssetFiatFormatter();

  const decoratedAssets = useDecoratedAssets(
    accountGroupId,
    includeNoBalance,
    tokenFilter,
    formatFiat,
  );

  const remoteTokens = useRemoteTokens(
    decoratedAssets,
    enrichTokenRequests,
    formatFiat,
  );

  const sortedAssets = useMemo(
    () =>
      [...decoratedAssets, ...remoteTokens].sort(
        (a, b) => b.sortKey - a.sortKey,
      ),
    [decoratedAssets, remoteTokens],
  );

  return sortedAssets;
}

/**
 * Decoration now happens in `selectAccountGroupAssets`, which memoises per
 * store state rather than per hook instance, so every consumer shares one
 * computation. Only the consumer-specific filter and fiat formatting remain
 * here, since both depend on arguments the selector cannot see.
 */
function useDecoratedAssets(
  accountGroupId: AccountGroupId | undefined,
  includeNoBalance: boolean,
  tokenFilter: ((chainId: string, address: string) => boolean) | undefined,
  formatFiat: AssetFiatFormatter,
): DecoratedAsset[] {
  const selectAssets = useCallback(
    (state: RootState) => selectAccountGroupAssets(state, accountGroupId),
    [accountGroupId],
  );

  const assets = useSelector(selectAssets);

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        if (tokenFilter) {
          const address = asset.assetId;

          if (
            !asset.chainId ||
            !address ||
            !tokenFilter(asset.chainId, address)
          ) {
            return false;
          }
        }

        return includeNoBalance || hasBalance(asset);
      }),
    [assets, includeNoBalance, tokenFilter],
  );

  return useMemo(
    () =>
      filteredAssets.map((asset) => ({
        ...asset,
        balanceInSelectedCurrency:
          asset.fiat?.balance === undefined
            ? undefined
            : formatFiat(new BigNumber(asset.fiat.balance)),
      })),
    [filteredAssets, formatFiat],
  );
}

function useRemoteTokens(
  assets: DecoratedAsset[],
  enrichTokenRequests: EnrichTokenRequest[],
  formatFiat: AssetFiatFormatter,
): DecoratedAsset[] {
  const assetIds = useMemo(
    () =>
      enrichTokenRequests.map((req) =>
        buildEvmCaip19AssetId(req.address, req.chainId),
      ),
    [enrichTokenRequests],
  );

  const tokensByAssetId = useTokensData(assetIds);

  const existingKeys = useMemo(
    () => new Set(assets.map((t) => t.key)),
    [assets],
  );

  // Only format when there is at least one enrichment placeholder to build,
  // so the formatter is never invoked for accounts with no remote tokens.
  const zeroFiat = useMemo(
    () => (enrichTokenRequests.length > 0 ? (formatFiat(0) ?? '') : ''),
    [enrichTokenRequests.length, formatFiat],
  );

  return useMemo(
    () =>
      enrichTokenRequests
        .map((req, i) => {
          const key = `${req.chainId.toLowerCase()}:${req.address.toLowerCase()}`;

          if (existingKeys.has(key)) return undefined;

          const caipId = assetIds[i];
          const data = tokensByAssetId[caipId];

          if (!data?.name && !data?.symbol) return undefined;

          return {
            accountType: EthAccountType.Eoa,
            address: req.address.toLowerCase(),
            balance: '0',
            balanceInSelectedCurrency: zeroFiat,
            chainId: req.chainId,
            decimals: data.decimals ?? 18,
            image: data.iconUrl ?? '',
            isETH: false,
            // Placeholders carry no balance, so no rate was ever requested.
            isEvmRateEligible: false,
            isNative: false,
            key,
            logo: data.iconUrl ?? undefined,
            name: data.name ?? '',
            networkBadgeSource: getNetworkBadgeSource(req.chainId),
            // Placeholders have no fiat balance, so they sort last.
            sortKey: 0,
            standard: TokenStandard.ERC20,
            symbol: data.symbol ?? '',
          } as DecoratedAsset;
        })
        .filter((token) => token !== undefined) as DecoratedAsset[],
    [enrichTokenRequests, existingKeys, assetIds, tokensByAssetId, zeroFiat],
  );
}
