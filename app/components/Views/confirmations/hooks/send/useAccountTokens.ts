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
import { selectERC20TokensByChain } from '../../../../../selectors/tokenListController';

const EMPTY_CACHE = {} as ReturnType<typeof selectERC20TokensByChain>;
const selectEmptyCache = () => EMPTY_CACHE;

export function useAccountTokens({
  includeNoBalance = false,
  includeAllTokens = false,
}: {
  includeNoBalance?: boolean;
  includeAllTokens?: boolean;
} = {}): AssetType[] {
  const assets = useSelector(selectAssetsBySelectedAccountGroup);
  const fiatCurrency = useSelector(selectCurrentCurrency);
  const tokensChainsCache = useSelector(
    includeAllTokens ? selectERC20TokensByChain : selectEmptyCache,
  );

  return useMemo(() => {
    const flatAssets = Object.values(assets).flat();

    const assetsWithBalance = flatAssets.filter((asset) => {
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

    if (includeAllTokens) {
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

      const existing = new Set(
        flatAssets.map(
          (a) =>
            `${String(a.chainId).toLowerCase()}:${String('address' in a ? a.address : a.assetId).toLowerCase()}`,
        ),
      );

      for (const [chainId, cache] of Object.entries(tokensChainsCache ?? {})) {
        for (const [address, entry] of Object.entries(cache?.data ?? {})) {
          if (
            existing.has(`${chainId.toLowerCase()}:${address.toLowerCase()}`)
          ) {
            continue;
          }
          processedAssets.push({
            address,
            chainId: chainId as Hex,
            accountType: EthAccountType.Eoa,
            name: entry.name ?? '',
            symbol: entry.symbol ?? '',
            decimals: entry.decimals ?? 18,
            image: entry.iconUrl ?? '',
            logo: entry.iconUrl ?? undefined,
            balance: '0',
            balanceInSelectedCurrency: zeroFiat,
            isETH: false,
            isNative: false,
            networkBadgeSource: getNetworkBadgeSource(chainId as Hex),
            standard: TokenStandard.ERC20,
          });
        }
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
    includeAllTokens,
    fiatCurrency,
    tokensChainsCache,
  ]) as unknown as AssetType[];
}
