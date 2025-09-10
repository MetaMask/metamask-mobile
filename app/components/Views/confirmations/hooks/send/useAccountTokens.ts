import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { isTestNet } from '../../../../../util/networks';
import Logger from '../../../../../util/Logger';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import I18n from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { getNetworkBadgeSource } from '../../utils/network';
import { AssetType, TokenStandard } from '../../types/token';
import { useSendScope } from './useSendScope';

export function useAccountTokens() {
  const assets = useSelector(selectAssetsBySelectedAccountGroup);
  const { isEvmOnly, isSolanaOnly } = useSendScope();
  const fiatCurrency = useSelector(selectCurrentCurrency);

  return useMemo(() => {
    const flatAssets = Object.values(assets).flat();

    let filteredAssets;

    if (isEvmOnly) {
      filteredAssets = flatAssets.filter((asset) =>
        asset.type.includes('eip155'),
      );
    } else if (isSolanaOnly) {
      filteredAssets = flatAssets.filter((asset) =>
        asset.type.includes('solana'),
      );
    } else {
      filteredAssets = flatAssets;
    }

    const assetsWithBalance = filteredAssets.filter((asset) => {
      const haveBalance = new BigNumber(asset.rawBalance, 16).isGreaterThan(0);

      const isTestNetAsset =
        isTestNet(asset.chainId) && asset.rawBalance !== '0x0';

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
  }, [assets, isEvmOnly, isSolanaOnly, fiatCurrency]) as unknown as AssetType[];
}
