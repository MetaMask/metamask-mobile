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
import Logger from '../../../../../util/Logger';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import I18n from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { getNetworkBadgeSource } from '../../utils/network';
import { AssetType, TokenStandard } from '../../types/token';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectTransactionPayAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../reducers';

export interface EnrichTokenRequest {
  chainId: Hex;
  address: string;
}

const EMPTY_REQUESTS: EnrichTokenRequest[] = [];

function useFromAccountGroupAssets() {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const accountOverride = useSelector((state: RootState) =>
    selectTransactionPayAccountOverrideByTransactionId(state, transactionId),
  );
  const fromAddress =
    accountOverride ?? (transactionMeta?.txParams?.from as string | undefined);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);

  const accountGroupId = useMemo(() => {
    if (!fromAddress) return undefined;
    const internalAccountId = Object.keys(internalAccountsById).find(
      (id) =>
        internalAccountsById[id].address.toLowerCase() ===
        fromAddress.toLowerCase(),
    );
    if (!internalAccountId) return undefined;
    return accountToGroupMap[internalAccountId]?.id;
  }, [fromAddress, internalAccountsById, accountToGroupMap]);

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
  const globalAssets = useSelector(selectAssetsBySelectedAccountGroup);
  const fromAccountAssets = useFromAccountGroupAssets();
  const assets = fromAccountAssets ?? globalAssets;
  const fiatCurrency = useSelector(selectCurrentCurrency);

  const assetIds = useMemo(
    () =>
      enrichTokenRequests.map((req) =>
        buildEvmCaip19AssetId(req.address, req.chainId),
      ),
    [enrichTokenRequests],
  );

  const tokensByAssetId = useTokensData(assetIds);

  return useMemo(() => {
    const flatAssets = Object.values(assets).flat();

    const assetsWithBalance = flatAssets.filter((asset) => {
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

    const processedAssets = assetsWithBalance.map((asset) => {
      const fiatAmount = new BigNumber(asset.fiat?.balance || 0);
      const hasDecimals = !fiatAmount.isInteger();

      let balanceInSelectedCurrency: string;
      try {
        balanceInSelectedCurrency = getIntlNumberFormatter(I18n.locale, {
          style: 'currency',
          currency: fiatCurrency,
          minimumFractionDigits: hasDecimals ? 2 : 0,
        }).format(fiatAmount.toFixed() as unknown as number);
      } catch (error) {
        Logger.error(error as Error);
        balanceInSelectedCurrency = `${fiatAmount.toFixed()} ${fiatCurrency}`;
      }

      return {
        ...asset,
        networkBadgeSource: getNetworkBadgeSource(asset.chainId as Hex),
        balanceInSelectedCurrency,
        standard: TokenStandard.ERC20 as const,
      } as AssetType;
    });

    if (enrichTokenRequests.length > 0) {
      let zeroFiat: string;
      try {
        zeroFiat = getIntlNumberFormatter(I18n.locale, {
          style: 'currency',
          currency: fiatCurrency,
          minimumFractionDigits: 0,
        }).format(0);
      } catch {
        zeroFiat = `0 ${fiatCurrency}`;
      }

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

    return processedAssets.sort(
      (a, b) =>
        new BigNumber(b.fiat?.balance || 0).comparedTo(
          new BigNumber(a.fiat?.balance || 0),
        ) || 0,
    );
  }, [
    assets,
    includeNoBalance,
    fiatCurrency,
    tokenFilter,
    enrichTokenRequests,
    assetIds,
    tokensByAssetId,
  ]) as unknown as AssetType[];
}
