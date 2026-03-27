import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { EthAccountType } from '@metamask/keyring-api';
import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { isTestNet } from '../../../../../util/networks';
import Logger from '../../../../../util/Logger';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import I18n from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { getNetworkBadgeSource } from '../../utils/network';
import { AssetType, TokenStandard } from '../../types/token';
import { useERC20Tokens } from '../../../../hooks/DisplayName/useERC20Tokens';
import { UseDisplayNameRequest } from '../../../../hooks/DisplayName/useDisplayName';

const EMPTY_REQUESTS: UseDisplayNameRequest[] = [];

export function useAccountTokens({
  includeNoBalance = false,
  tokenFilter,
  enrichTokenRequests = EMPTY_REQUESTS,
}: {
  includeNoBalance?: boolean;
  tokenFilter?: (chainId: string, address: string) => boolean;
  enrichTokenRequests?: UseDisplayNameRequest[];
} = {}): AssetType[] {
  const assets = useSelector(selectAssetsBySelectedAccountGroup);
  const fiatCurrency = useSelector(selectCurrentCurrency);
  const apiTokenResults = useERC20Tokens(enrichTokenRequests);

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
        const key = `${(req.variation as string).toLowerCase()}:${req.value.toLowerCase()}`;
        if (existingKeys.has(key)) continue;

        const data = apiTokenResults[i];
        if (!data?.name && !data?.symbol) continue;

        const chainId = req.variation as Hex;
        processedAssets.push({
          address: req.value.toLowerCase(),
          chainId,
          accountType: EthAccountType.Eoa,
          name: data.name ?? '',
          symbol: data.symbol ?? '',
          decimals: data.decimals ?? 18,
          image: data.image ?? '',
          logo: data.image ?? undefined,
          balance: '0',
          balanceInSelectedCurrency: zeroFiat,
          isETH: false,
          isNative: false,
          networkBadgeSource: getNetworkBadgeSource(chainId),
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
    apiTokenResults,
  ]) as unknown as AssetType[];
}
