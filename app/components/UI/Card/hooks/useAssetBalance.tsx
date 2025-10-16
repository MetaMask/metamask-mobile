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
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import Engine from '../../../../core/Engine';
import {
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';

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
  const { MultichainAssetsRatesController } = Engine.context;
  const popularNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const chainIds = Object.entries(popularNetworks || {})
    .map((network) => network[1]?.chainId)
    .filter(Boolean);
  if (!chainIds.includes(SOLANA_MAINNET.chainId as Hex)) {
    chainIds.push(SOLANA_MAINNET.chainId as Hex);
  }
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

  if (!asset && token) {
    const assetAddress =
      token.chainId && isSolanaChainId(token.chainId)
        ? `${token.chainId}/token:${token.address}`
        : token.address.toLowerCase();
    const iconUrl = buildTokenIconUrl(token.chainId, token.address);
    const filteredToken = tokensWithBalance.find(
      (t) => t.address === assetAddress && t.chainId === token.chainId,
    );

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
  const chainId = asset?.chainId as Hex;

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
        asset.balance = token.availableBalance.toString();
        asset.balanceFiat = undefined; // Reset balanceFiat to undefined to fetch a new balanceFiat based on the new balance
        let derivedBalance;

        if (isSolanaChainId(chainId)) {
          const conversionRates =
            MultichainAssetsRatesController.state.conversionRates;
          const assetConversionRate =
            conversionRates[
              `${chainId}/token:${asset.address}` as `${string}:${string}/${string}:${string}`
            ];

          // If the asset conversion rate is found, use it to calculate the balance fiat based on the availableBalance prop.
          if (assetConversionRate) {
            const balanceFiatCalculation = Number(
              balanceToFiatNumber(
                token.availableBalance.toString(),
                Number(assetConversionRate.rate),
                1,
              ),
            );
            derivedBalance = {
              balance: token.availableBalance.toString(),
              balanceFiat: addCurrencySymbol(balanceFiatCalculation, 'usd'),
              balanceValueFormatted: `${token.availableBalance.toString()} ${
                asset.symbol
              }`,
            };
          } else {
            // If the asset conversion rate is not found, use the  availableBalance prop + symbol to display the balance.
            derivedBalance = {
              balance: token.availableBalance.toString(),
              balanceFiat: `${token.availableBalance.toString()} ${
                asset.symbol
              }`,
              balanceValueFormatted: `${token.availableBalance.toString()} ${
                asset.symbol
              }`,
            };
          }
        } else {
          derivedBalance = deriveBalanceFromAssetMarketDetails(
            asset,
            exchangeRates || {},
            {},
            conversionRate || 0,
            currentCurrency || '',
          );
        }

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
    }, [
      asset,
      token,
      chainId,
      MultichainAssetsRatesController.state.conversionRates,
      currentCurrency,
      exchangeRates,
      conversionRate,
    ]);

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
