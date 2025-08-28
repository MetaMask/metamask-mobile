import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { useSendScope } from './useSendScope';
import { getNetworkBadgeSource } from '../../utils/network';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import I18n from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { AssetType, TokenStandard } from '../../types/token';

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

    const assetsWithBalance = filteredAssets.filter(
      (asset) =>
        asset.fiat?.balance &&
        new BigNumber(asset.fiat.balance).isGreaterThan(0),
    );

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
        balanceInSelectedCurrency = `${fiatAmount.toFixed()} ${fiatCurrency}`;
      }

      return {
        ...asset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        networkBadgeSource: getNetworkBadgeSource(asset.chainId as any),
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
