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

  // useTokenFiatRates crashes on non-hex addresses (Solana etc.), so we
  // build requests for EVM assets only. Non-EVM assets are handled below in
  // the render memo by falling back to `asset.fiat.balance`.
  const fiatRateRequests = useMemo<TokenFiatRateRequest[]>(
    () =>
      assetsWithBalance
        .filter((asset) => asset.chainId && !isNonEvmChainId(asset.chainId))
        .map((asset) => ({
          address: asset.address as Hex,
          chainId: asset.chainId as Hex,
          currency: fiatCurrency.toLowerCase(),
        })),
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

    // EVM assets use the useTokenFiatRates-derived rate (picks up stablecoin
    // bypass, and lets us convert to USD in pay flow). Non-EVM assets fall
    // back to the assets-controller's preferred-currency `fiat.balance`,
    // which is the pre-existing behavior for Solana/Bitcoin/etc.
    // EVM assets and rates are in lockstep — both arrays derived from the
    // same predicate over the same list, so a single index walk pairs them.
    let evmIndex = 0;
    const processedAssets = assetsWithBalance.map((asset) => {
      const isEvm = asset.chainId && !isNonEvmChainId(asset.chainId);
      const rate = isEvm ? fiatRates[evmIndex++] : undefined;

      let fiatAmount: BigNumber.Value | undefined;
      if (isFiatHidden(asset.chainId)) {
        fiatAmount = undefined;
      } else if (isEvm) {
        fiatAmount =
          rate !== undefined && asset.balance
            ? new BigNumber(asset.balance).multipliedBy(rate)
            : undefined;
      } else {
        fiatAmount = asset.fiat?.balance;
      }

      const balanceInSelectedCurrency =
        fiatAmount !== undefined ? formatFiat(fiatAmount) : undefined;

      return {
        ...asset,
        networkBadgeSource: getNetworkBadgeSource(asset.chainId as Hex),
        balanceInSelectedCurrency,
        standard: TokenStandard.ERC20 as const,
      } as AssetType;
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

    const sortableFiatBalance = (asset: AssetType) =>
      isFiatHidden(asset.chainId)
        ? new BigNumber(0)
        : new BigNumber(asset.fiat?.balance || 0);

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
