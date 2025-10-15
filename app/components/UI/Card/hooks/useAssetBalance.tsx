import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import {
  selectPrimaryCurrency,
  selectShowFiatInTestnets,
} from '../../../../selectors/settings';
import { TOKEN_RATE_UNDEFINED } from '../../Tokens/constants';
import { strings } from '../../../../../locales/i18n';
import { isTestNet } from '../../../../util/networks';
import { TokenI } from '../../Tokens/types';
import { CardTokenAllowance } from '../types';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { selectAllPopularNetworkConfigurations } from '../../../../selectors/networkController';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { selectSingleTokenPriceMarketData } from '../../../../selectors/tokenRatesController';

// This hook retrieves the asset balance and related information for a given token and account.
export const useAssetBalance = (
  token: CardTokenAllowance | null | undefined,
): {
  asset: TokenI | undefined;
  balanceFiat: string | undefined;
  mainBalance: string | undefined;
  secondaryBalance: string | undefined;
  rawFiatNumber: number | undefined;
  rawTokenBalance: number | undefined;
} => {
  const popularNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const chainIds = Object.entries(popularNetworks || {})
    .map((network) => network[1]?.chainId)
    .filter(Boolean);
  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });

  let asset = useSelector((state: RootState) =>
    token
      ? selectAsset(state, {
          address: token.address,
          chainId: token.chainId as string,
          isStaked: token.isStaked,
        })
      : undefined,
  );
  const chainId = asset?.chainId as Hex;

  if (!asset && token) {
    const iconUrl = buildTokenIconUrl(chainId, token.address);
    const filteredToken = tokensWithBalance.find((t) => {
      if (token.chainId && isSolanaChainId(token.chainId)) {
        return t.address === token.address && t.chainId === token.chainId;
      }

      return (
        t.address.toLowerCase() === token.address.toLowerCase() &&
        t.chainId === token.chainId
      );
    });

    asset = {
      ...token,
      image: iconUrl,
      logo: iconUrl,
      isETH: false,
      aggregators: [],
      balance: filteredToken?.balance ?? '0',
      balanceFiat: filteredToken?.balanceFiat ?? '0',
    } as TokenI;
  }

  const primaryCurrency = useSelector(selectPrimaryCurrency) ?? 'ETH';
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const conversionRate = useSelector((state: RootState) =>
    selectCurrencyRateForChainId(state, chainId as Hex),
  );
  const exchangeRates = useSelector((state: RootState) =>
    selectSingleTokenPriceMarketData(state, chainId, asset?.address as Hex),
  );
  const currentCurrency = useSelector(selectCurrentCurrency);

  const { balanceFiat, balanceValueFormatted, rawFiatNumber, rawTokenBalance } =
    useMemo(() => {
      if (!asset || !token) {
        return {
          balanceFiat: '',
          balanceValueFormatted: '',
          rawFiatNumber: undefined,
          rawTokenBalance: undefined,
        };
      }

      if (token.availableBalance) {
        const tokenBalances = {
          [token.address]: token.availableBalance.toString() as `0x${string}`,
        };
        const derivedBalance = deriveBalanceFromAssetMarketDetails(
          asset,
          exchangeRates || {},
          tokenBalances,
          conversionRate || 0,
          currentCurrency || '',
        );

        return {
          ...derivedBalance,
          rawTokenBalance: derivedBalance.balance
            ? parseFloat(String(derivedBalance.balance).replace(/[^0-9.]/g, ''))
            : undefined,
          rawFiatNumber: derivedBalance.balanceFiatCalculation,
        };
      }

      return {
        balanceFiat: asset.balanceFiat,
        balanceValueFormatted: asset.balance,
        rawFiatNumber: asset.balanceFiat
          ? parseFloat(asset.balanceFiat)
          : undefined,
        rawTokenBalance: asset.balance ? parseFloat(asset.balance) : undefined,
      };
    }, [asset, token, exchangeRates, conversionRate, currentCurrency]);

  let mainBalance;
  let secondaryBalance;
  const shouldNotShowBalanceOnTestnets =
    isTestNet(chainId) && !showFiatOnTestnets;

  if (primaryCurrency === 'ETH') {
    mainBalance = balanceValueFormatted;
    secondaryBalance = balanceFiat;

    if (asset?.isETH) {
      mainBalance = balanceValueFormatted;
      secondaryBalance = shouldNotShowBalanceOnTestnets
        ? undefined
        : balanceFiat;
    }
  } else {
    secondaryBalance = balanceValueFormatted;
    if (shouldNotShowBalanceOnTestnets && !balanceFiat) {
      mainBalance = undefined;
    } else {
      mainBalance =
        balanceFiat ?? strings('wallet.unable_to_find_conversion_rate');
    }
  }

  if (asset?.hasBalanceError) {
    mainBalance = asset.symbol;
    secondaryBalance = strings('wallet.unable_to_load');
  }

  if (balanceFiat === TOKEN_RATE_UNDEFINED) {
    mainBalance = balanceValueFormatted;
    secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
  }

  asset = asset && { ...asset, balanceFiat, isStaked: asset?.isStaked };

  return {
    asset,
    mainBalance,
    balanceFiat,
    secondaryBalance,
    rawFiatNumber,
    rawTokenBalance,
  };
};
