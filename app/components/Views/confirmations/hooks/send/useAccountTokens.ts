import type { Asset } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { EthAccountType } from '@metamask/keyring-api';
import {
  selectAssetsBySelectedAccountGroup,
  selectAssetsByAccountGroupId,
} from '../../../../../selectors/assets/assets-list';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { isTestNet } from '../../../../../util/networks';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { getNetworkBadgeSource } from '../../utils/network';
import { AssetType, TokenStandard } from '../../types/token';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import type { RootState } from '../../../../../reducers';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useAssetFiatFormatter } from '../pay/useAssetFiatFormatter';
import {
  TokenFiatRateRequest,
  useTokenFiatRates,
} from '../tokens/useTokenFiatRates';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { isNetworkTestnet } from './useNetworkFilter';

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
  const accountOverride = useTransactionAccountOverride();
  const globalAssets = useSelector(selectAssetsBySelectedAccountGroup);
  const accountAssets = useAccountGroupAssets(accountOverride);
  // When an account override is active, always use its assets (even if empty)
  // to avoid showing stale tokens from the globally selected account.
  const assets = useMemo(
    () =>
      accountOverride !== undefined ? (accountAssets ?? {}) : globalAssets,
    [accountOverride, accountAssets, globalAssets],
  );

  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const { format: formatFiat, fiatCurrency } = useAssetFiatFormatter();

  const assetsWithBalance = useMemo(() => {
    const flatAssets = Object.values(assets).flat();
    return flatAssets.filter((asset) => {
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

      if (includeNoBalance) {
        return true;
      }

      const haveBalance =
        (asset.fiat?.balance &&
          new BigNumber(asset.fiat.balance).isGreaterThan(0)) ||
        (asset.rawBalance && asset.rawBalance !== '0x0');

      const isTestNetAsset =
        isTestNet(asset.chainId) &&
        asset.rawBalance &&
        asset.rawBalance !== '0x0';

      return haveBalance || isTestNetAsset;
    });
  }, [assets, includeNoBalance, tokenFilter]);

  const fiatRateRequests = useMemo<TokenFiatRateRequest[]>(
    () =>
      assetsWithBalance
        .filter(isEvmRateEligible)
        .map((asset) => buildFiatRateRequest(asset, fiatCurrency)),
    [assetsWithBalance, fiatCurrency],
  );

  const fiatRates = useTokenFiatRates(fiatRateRequests);

  const assetIds = useMemo(
    () =>
      enrichTokenRequests.map((req) =>
        buildEvmCaip19AssetId(req.address, req.chainId),
      ),
    [enrichTokenRequests],
  );

  const tokensByAssetId = useTokensData(assetIds);

  return useMemo(() => {
    // "Show conversion on test networks" setting: when disabled, testnet
    // assets must not display fiat values nor be ranked by them.
    const isFiatHidden = (chainId?: string) =>
      !showFiatOnTestnets &&
      Boolean(chainId) &&
      isNetworkTestnet(chainId as string);

    const sortableFiatByAsset = new WeakMap<AssetType, BigNumber>();
    let evmIndex = 0;
    const processedAssets = assetsWithBalance.map((asset) => {
      const rate = isEvmRateEligible(asset) ? fiatRates[evmIndex++] : undefined;
      const fiatAmount = deriveAssetFiat(
        asset,
        rate,
        isFiatHidden(asset.chainId),
      );

      const balanceInSelectedCurrency =
        fiatAmount !== undefined ? formatFiat(fiatAmount) : undefined;

      const processed = {
        ...asset,
        networkBadgeSource: getNetworkBadgeSource(asset.chainId as Hex),
        balanceInSelectedCurrency,
        standard: TokenStandard.ERC20 as const,
      } as AssetType;

      if (fiatAmount !== undefined) {
        sortableFiatByAsset.set(processed, fiatAmount);
      }
      return processed;
    });

    if (enrichTokenRequests.length > 0) {
      const zeroFiat = formatFiat(0) ?? '';

      const existingKeys = new Set(
        processedAssets.map(
          (t) =>
            `${t.chainId?.toLowerCase()}:${(t.address ?? '').toLowerCase()}`,
        ),
      );

      for (let i = 0; i < enrichTokenRequests.length; i++) {
        const req = enrichTokenRequests[i];
        const key = `${req.chainId.toLowerCase()}:${req.address.toLowerCase()}`;
        if (existingKeys.has(key)) continue;

        const caipId = assetIds[i];
        const data = tokensByAssetId[caipId];
        if (!data?.name && !data?.symbol) continue;

        processedAssets.push({
          address: req.address.toLowerCase(),
          chainId: req.chainId,
          accountType: EthAccountType.Eoa,
          name: data.name ?? '',
          symbol: data.symbol ?? '',
          decimals: data.decimals ?? 18,
          image: data.iconUrl ?? '',
          logo: data.iconUrl ?? undefined,
          balance: '0',
          balanceInSelectedCurrency: zeroFiat,
          isETH: false,
          isNative: false,
          networkBadgeSource: getNetworkBadgeSource(req.chainId),
          standard: TokenStandard.ERC20,
        } as AssetType);
      }
    }

    // Sort by the same fiat we display. Falls back to the assets-controller
    // preferred-currency balance for tokens that have no derived fiat (e.g.
    // enrichment placeholders added below with `zeroFiat`), so unknown
    // tokens sink to the bottom.
    const sortableFiatBalance = (asset: AssetType) => {
      if (isFiatHidden(asset.chainId)) return new BigNumber(0);
      const derived = sortableFiatByAsset.get(asset);
      if (derived !== undefined) return derived;
      return new BigNumber(asset.fiat?.balance || 0);
    };

    return processedAssets.sort(
      (a, b) => sortableFiatBalance(b).comparedTo(sortableFiatBalance(a)) || 0,
    );
  }, [
    assetsWithBalance,
    showFiatOnTestnets,
    enrichTokenRequests,
    assetIds,
    tokensByAssetId,
    formatFiat,
    fiatRates,
  ]) as unknown as AssetType[];
}

function useAccountGroupAssets(accountAddress?: string | null) {
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);

  const accountGroupId = useMemo(() => {
    if (!accountAddress) return undefined;
    const internalAccountId = Object.keys(internalAccountsById).find(
      (id) =>
        internalAccountsById[id].address.toLowerCase() ===
        accountAddress.toLowerCase(),
    );
    if (!internalAccountId) return undefined;
    return accountToGroupMap[internalAccountId]?.id;
  }, [accountAddress, internalAccountsById, accountToGroupMap]);

  const selectOverrideAssets = useCallback(
    (state: RootState) => selectAssetsByAccountGroupId(state, accountGroupId),
    [accountGroupId],
  );

  const overrideAssets = useSelector(selectOverrideAssets);
  return accountGroupId ? overrideAssets : undefined;
}

/**
 * Whether the asset is EVM-scoped with a hex address, i.e. eligible for
 * `useTokenFiatRates` (which crashes on non-hex addresses like Solana).
 * Non-EVM assets fall back to `asset.fiat.balance` in the render loop.
 *
 * This predicate is the single source of truth for the paired walks over
 * `assetsWithBalance` — request build and rate consumption — so they cannot
 * drift out of lockstep.
 */
function isEvmRateEligible(asset: Asset): boolean {
  return (
    Boolean(asset.chainId) &&
    !isNonEvmChainId(asset.chainId) &&
    'address' in asset &&
    Boolean(asset.address)
  );
}

function buildFiatRateRequest(
  asset: Asset,
  currency: string,
): TokenFiatRateRequest {
  return {
    address: (asset as { address: Hex }).address,
    chainId: asset.chainId as Hex,
    currency: currency.toLowerCase(),
  };
}

/**
 * Fiat amount to display for a single asset, or `undefined` to hide.
 *
 * - Testnet-hidden → undefined.
 * - EVM with rate → `balance * rate` (picks up stablecoin bypass).
 * - EVM zero balance without rate → `0` (currency-invariant, avoids
 * hiding `$0` rows when market data hasn't loaded).
 * - EVM non-zero without rate → undefined (can't safely render).
 * - Non-EVM → the assets-controller's preferred-currency `fiat.balance`.
 */
function deriveAssetFiat(
  asset: Asset,
  rate: number | undefined,
  isFiatHidden: boolean,
): BigNumber | undefined {
  if (isFiatHidden) return undefined;

  if (isEvmRateEligible(asset)) {
    const balance = asset.balance ? new BigNumber(asset.balance) : undefined;
    if (rate !== undefined && balance) return balance.multipliedBy(rate);
    if (balance?.isZero()) return new BigNumber(0);
    return undefined;
  }

  return asset.fiat?.balance ? new BigNumber(asset.fiat.balance) : undefined;
}
