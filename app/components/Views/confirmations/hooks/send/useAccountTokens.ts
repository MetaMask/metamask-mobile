import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';

import { selectFilteredAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { isTestNet } from '../../../../../util/networks';
import Logger from '../../../../../util/Logger';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import I18n from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { getNetworkBadgeSource } from '../../utils/network';
import { AssetType, TokenStandard } from '../../types/token';
import { useSendType } from './useSendType';

export function useAccountTokens({
  includeNoBalance = false,
} = {}): AssetType[] {
  const assets = useSelector(selectFilteredAssetsBySelectedAccountGroup);
  const { isEvmSendType, isSolanaSendType, isTronSendType, isBitcoinSendType } =
    useSendType();
  const fiatCurrency = useSelector(selectCurrentCurrency);

  return useMemo(() => {
    const flatAssets = Object.values(assets).flat();

    const accountTypeMap: Record<string, boolean> = {
      eip155: !!isEvmSendType,
      solana: !!isSolanaSendType,
      tron: !!isTronSendType,
      bip122: !!isBitcoinSendType,
    };

    const matchedAccountType = Object.entries(accountTypeMap).find(
      ([, isType]) => isType,
    )?.[0];

    const filteredAssets = matchedAccountType
      ? flatAssets.filter((asset) =>
          asset.accountType.includes(matchedAccountType),
        )
      : flatAssets;

    const assetsWithBalance = filteredAssets.filter((asset) => {
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
      };
    });

    return processedAssets.sort(
      (a, b) =>
        new BigNumber(b.fiat?.balance || 0).comparedTo(
          new BigNumber(a.fiat?.balance || 0),
        ) || 0,
    );
  }, [
    assets,
    includeNoBalance,
    isEvmSendType,
    isSolanaSendType,
    isTronSendType,
    isBitcoinSendType,
    fiatCurrency,
  ]) as unknown as AssetType[];
}
