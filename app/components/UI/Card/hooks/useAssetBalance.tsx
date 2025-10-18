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
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { createSelector } from 'reselect';

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
  const chainIds = [LINEA_CHAIN_ID, SOLANA_MAINNET.chainId];

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

  const assetBalanceSelector = createSelector(
    [
      selectPrimaryCurrency,
      selectShowFiatInTestnets,
      (rootState) => selectCurrencyRateForChainId(rootState, chainId),
      (rootState) =>
        selectSingleTokenPriceMarketData(
          rootState,
          chainId,
          asset?.address as Hex,
        ),
      selectCurrentCurrency,
    ],
    (
      primaryCurrency,
      showFiatOnTestnets,
      conversionRate,
      exchangeRates,
      currentCurrency,
    ) => ({
      primaryCurrency: primaryCurrency ?? 'ETH',
      showFiatOnTestnets,
      conversionRate,
      exchangeRates,
      currentCurrency,
    }),
  );
  const assetBalance = useSelector(assetBalanceSelector);
  const {
    primaryCurrency,
    showFiatOnTestnets,
    conversionRate,
    exchangeRates,
    currentCurrency,
  } = assetBalance;

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
        asset.balance = token.availableBalance;
        asset.balanceFiat = undefined; // Reset balanceFiat to undefined to fetch a new balanceFiat based on the new balance
        let derivedBalance;

        if (isSolanaChainId(chainId)) {
          const conversionRates =
            MultichainAssetsRatesController?.state?.conversionRates;
          const assetConversionRate =
            conversionRates[
              `${chainId}/token:${asset.address}` as `${string}:${string}/${string}:${string}`
            ];

          // If the asset conversion rate is found, use it to calculate the balance fiat based on the availableBalance prop.
          if (assetConversionRate) {
            const balanceFiatCalculation = Number(
              balanceToFiatNumber(
                token.availableBalance,
                Number(assetConversionRate.rate),
                1,
              ),
            );
            derivedBalance = {
              balance: token.availableBalance,
              balanceFiat: addCurrencySymbol(balanceFiatCalculation, 'usd'),
              balanceValueFormatted: `${token.availableBalance} ${asset.symbol}`,
            };
          } else {
            // If the asset conversion rate is not found, use the  availableBalance prop + symbol to display the balance.
            derivedBalance = {
              balance: token.availableBalance,
              balanceFiat: `${token.availableBalance} ${asset.symbol}`,
              balanceValueFormatted: `${token.availableBalance} ${asset.symbol}`,
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
      MultichainAssetsRatesController?.state?.conversionRates,
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

  if (balanceFiat === TOKEN_RATE_UNDEFINED) {
    mainBalance = balanceValueFormatted;
    secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
  }

  if (asset?.hasBalanceError) {
    mainBalance = asset.symbol;
    secondaryBalance = strings('wallet.unable_to_load');
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
