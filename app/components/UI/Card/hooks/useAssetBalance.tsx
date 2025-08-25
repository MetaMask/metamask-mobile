import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { useMemo } from 'react';
import { makeSelectAssetByAddressAndChainId } from '../../../../selectors/multichain';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { Hex } from '@metamask/utils';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../../selectors/settings';
import { selectSingleTokenPriceMarketData } from '../../../../selectors/tokenRatesController';
import { selectSingleTokenBalance } from '../../../../selectors/tokenBalancesController';
import { formatWithThreshold } from '../../../../util/assets';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_RATE_UNDEFINED,
} from '../../Tokens/constants';
import I18n, { strings } from '../../../../../locales/i18n';
import { isTestNet } from '../../../../util/networks';
import { TokenI } from '../../Tokens/types';
import { CardTokenAllowance } from '../types';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { selectAllPopularNetworkConfigurations } from '../../../../selectors/networkController';

// This hook retrieves the asset balance and related information for a given token and account.
export const useAssetBalance = (
  token: CardTokenAllowance | null | undefined,
): {
  asset: TokenI | undefined;
  balanceFiat: string | undefined;
  mainBalance: string | undefined;
  secondaryBalance: string | undefined;
} => {
  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const popularNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const chainIds = Object.entries(popularNetworks || {})
    .map((network) => network[1]?.chainId)
    .filter(Boolean);
  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });

  const selectEvmAsset = useMemo(
    () => makeSelectAssetByAddressAndChainId(),
    [],
  );

  const evmAsset = useSelector((state: RootState) =>
    token?.chainId
      ? selectEvmAsset(state, {
          address: token.address,
          isStaked: token.isStaked,
          chainId: token.chainId,
        })
      : undefined,
  );

  let asset = evmAsset;
  let isMappedAsset = false;

  if (!asset && token) {
    const iconUrl = buildTokenIconUrl(token.chainId, token.address);
    const filteredToken = tokensWithBalance.find(
      (t) =>
        t.address.toLowerCase() === token.address.toLowerCase() &&
        t.chainId === token.chainId,
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
    isMappedAsset = true;
  }

  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  // Market data selectors
  const exchangeRates = useSelector((state: RootState) =>
    asset?.chainId && asset?.address
      ? selectSingleTokenPriceMarketData(
          state,
          asset.chainId as Hex,
          asset.address as Hex,
        )
      : undefined,
  );

  // Token balance selectors
  const tokenBalances = useSelector((state: RootState) =>
    selectedInternalAccountAddress && asset?.chainId && asset?.address
      ? selectSingleTokenBalance(
          state,
          selectedInternalAccountAddress as Hex,
          asset.chainId as Hex,
          asset.address as Hex,
        )
      : undefined,
  );

  const conversionRate = useSelector((state: RootState) =>
    asset?.chainId
      ? selectCurrencyRateForChainId(state, asset.chainId as Hex)
      : undefined,
  );

  const oneHundredths = 0.01;
  const oneHundredThousandths = 0.00001;

  const { balanceFiat, balanceValueFormatted } = useMemo(() => {
    if (!asset || !token) {
      return {
        balanceFiat: '',
        balanceValueFormatted: '',
      };
    }

    if (isMappedAsset) {
      const zeroBalanceFiat = formatWithThreshold(
        0,
        oneHundredths,
        I18n.locale,
        { style: 'currency', currency: currentCurrency },
      );
      const zeroBalanceFormatted = `0 ${asset.symbol}`;

      return {
        balanceFiat:
          asset.balanceFiat && asset.balanceFiat !== '0'
            ? asset.balanceFiat
            : zeroBalanceFiat,
        balanceValueFormatted:
          asset.balance && asset.balance !== '0'
            ? formatWithThreshold(
                parseFloat(asset.balance),
                oneHundredThousandths,
                I18n.locale,
                { minimumFractionDigits: 0, maximumFractionDigits: 5 },
              )
            : zeroBalanceFormatted,
      };
    }

    if (isEvmNetworkSelected && asset) {
      return deriveBalanceFromAssetMarketDetails(
        asset,
        exchangeRates || {},
        tokenBalances || {},
        conversionRate || 0,
        currentCurrency || '',
      );
    }

    return {
      balanceFiat: asset?.balanceFiat
        ? formatWithThreshold(
            parseFloat(asset.balanceFiat),
            oneHundredths,
            I18n.locale,
            { style: 'currency', currency: currentCurrency },
          )
        : TOKEN_BALANCE_LOADING,
      balanceValueFormatted: asset?.balance
        ? formatWithThreshold(
            parseFloat(asset.balance),
            oneHundredThousandths,
            I18n.locale,
            { minimumFractionDigits: 0, maximumFractionDigits: 5 },
          )
        : TOKEN_BALANCE_LOADING,
    };
  }, [
    token,
    isEvmNetworkSelected,
    asset,
    exchangeRates,
    tokenBalances,
    conversionRate,
    currentCurrency,
    isMappedAsset,
  ]);

  let mainBalance;
  let secondaryBalance;
  const shouldNotShowBalanceOnTestnets =
    isTestNet(asset?.chainId as Hex) && !showFiatOnTestnets;

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

  if (evmAsset?.hasBalanceError) {
    mainBalance = evmAsset.symbol;
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
  };
};
