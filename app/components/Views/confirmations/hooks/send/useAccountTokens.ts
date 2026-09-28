import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { EthAccountType } from '@metamask/keyring-api';
import type { AccountGroupId } from '@metamask/account-api';
import { getNetworkBadgeSource } from '../../utils/network';
import { formatFiat } from '../../utils/fiat';
import { AssetType, TokenStandard } from '../../types/token';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { getSelectedCurrency } from '../../../../../selectors/assets/assets-controller';
import type { RootState } from '../../../../../reducers';
import { useTransactionPayCurrency } from '../pay/useTransactionPayCurrency';
import {
  type ConfirmationAsset,
  selectConfirmationAssetsByAccountGroupId,
  selectConfirmationAssetsWithBalanceByAccountGroupId,
} from '../../selectors/assets';
import { useAccountOverrideGroupId } from './useAccountOverrideGroupId';
import { useEnsureAccountGroupAssets } from './useEnsureAccountGroupAssets';

export interface EnrichTokenRequest {
  chainId: Hex;
  address: string;
}

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
  const accountGroupId = useAccountOverrideGroupId();

  // Assets are only fetched automatically for the selected account group, so an
  // override account the user has never activated has no entry in assets state.
  // Request it on demand, otherwise the token list stays permanently empty.
  useEnsureAccountGroupAssets(accountGroupId);

  // Pay-flow confirmations price everything in USD. Resolved here and passed
  // down so the selector stays unaware of transaction types.
  const currencyOverride = useTransactionPayCurrency();

  const decoratedAssets = useDecoratedAssets(
    accountGroupId,
    currencyOverride,
    includeNoBalance,
    tokenFilter,
  );

  const remoteTokens = useRemoteTokens(
    decoratedAssets,
    currencyOverride,
    enrichTokenRequests,
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
 * Decoration and fiat formatting happen in
 * `selectConfirmationAssetsByAccountGroupId`, which memoises per store state
 * rather than per hook instance, so every consumer shares one computation.
 * Only the consumer-specific token filter remains here, since it depends on a
 * callback the selector cannot see.
 */
function useDecoratedAssets(
  accountGroupId: AccountGroupId | undefined,
  currencyOverride: string | undefined,
  includeNoBalance: boolean,
  tokenFilter: ((chainId: string, address: string) => boolean) | undefined,
): ConfirmationAsset[] {
  const selectAssets = useCallback(
    (state: RootState) =>
      includeNoBalance
        ? selectConfirmationAssetsByAccountGroupId(
            state,
            accountGroupId,
            currencyOverride,
          )
        : selectConfirmationAssetsWithBalanceByAccountGroupId(
            state,
            accountGroupId,
            currencyOverride,
          ),
    [accountGroupId, currencyOverride, includeNoBalance],
  );

  const assets = useSelector(selectAssets);

  // Returns the selector's array untouched when no filter is supplied, so the
  // reference stays stable and downstream memos are not invalidated.
  return useMemo(() => {
    if (!tokenFilter) {
      return assets;
    }

    return assets.filter((asset) => {
      const { assetId, chainId } = asset;

      if (!chainId || !assetId) {
        return false;
      }

      return tokenFilter(chainId, assetId);
    });
  }, [assets, tokenFilter]);
}

function useRemoteTokens(
  assets: ConfirmationAsset[],
  currencyOverride: string | undefined,
  enrichTokenRequests: EnrichTokenRequest[],
): ConfirmationAsset[] {
  const selectedCurrency = useSelector(getSelectedCurrency);
  const currency = currencyOverride ?? selectedCurrency;

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
    () =>
      enrichTokenRequests.length > 0 ? (formatFiat(0, currency) ?? '') : '',
    [currency, enrichTokenRequests.length],
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
            isNative: false,
            key,
            logo: data.iconUrl ?? undefined,
            name: data.name ?? '',
            networkBadgeSource: getNetworkBadgeSource(req.chainId),
            // Placeholders have no fiat balance, so they sort last.
            sortKey: 0,
            standard: TokenStandard.ERC20,
            symbol: data.symbol ?? '',
          } as ConfirmationAsset;
        })
        .filter((token) => token !== undefined) as ConfirmationAsset[],
    [enrichTokenRequests, existingKeys, assetIds, tokensByAssetId, zeroFiat],
  );
}
