import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectMultichainDefaultToken,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainConversionRate,
  selectMultichainCurrentNetwork,
  selectMultichainShouldShowFiat,
} from '../../../selectors/multichain/multichainNonEvm';
import { TokenList } from '../Tokens/TokenList';
import { TokenI } from '../Tokens/types';
import { renderFiat } from '../../../util/number';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import images from '../../../images/image-icons';
import { Image } from 'react-native';

// We need this type to match ScrollableTabView's requirements
interface NonEvmTokensProps {
  tabLabel?: string;
}

const NonEvmTokens: React.FC<NonEvmTokensProps> = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Get all the data we need from selectors
  const defaultToken = useSelector(selectMultichainDefaultToken);
  const nativeTokenBalance = useSelector(
    selectMultichainSelectedAccountCachedBalance,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { symbol } = useSelector(selectMultichainDefaultToken);
  const conversionRate = useSelector(selectMultichainConversionRate);
  const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
  const network = useSelector(selectMultichainCurrentNetwork);

  function getMultiChainFiatBalance(): string {
    if (conversionRate) {
      const multichainBalance = Number(nativeTokenBalance);
      const fiatBalance = multichainBalance * conversionRate;
      return renderFiat(fiatBalance, currentCurrency);
    }
    return `${nativeTokenBalance} ${symbol}`;
  }

  // Get the URI from the imported image
  const btcImage = Image.resolveAssetSource(images.BTC);

  // Format the Bitcoin data to match TokenI interface
  const formattedTokens: TokenI[] = [
    {
      address: '', // Bitcoin doesn't use addresses for the native token
      aggregators: [],
      decimals: 6,
      image: btcImage.uri,
      name: network.nickname,
      symbol: defaultToken.symbol,
      balance: nativeTokenBalance || '0',
      balanceFiat: shouldShowFiat ? getMultiChainFiatBalance() : '',
      logo: btcImage.uri,
      isETH: false,
      isNative: true,
      ticker: defaultToken.symbol,
    },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const showRemoveMenu = useCallback(() => {
    // Bitcoin can't be removed as it's the native token
  }, []);

  const goToAddToken = useCallback(() => {
    // Bitcoin doesn't support adding tokens yet
  }, []);

  return (
    <TokenList
      tokens={formattedTokens}
      refreshing={refreshing}
      isAddTokenEnabled={false}
      onRefresh={onRefresh}
      showRemoveMenu={showRemoveMenu}
      goToAddToken={goToAddToken}
      showPercentageChange={false}
      showNetworkAvatar={false}
    />
  );
};

export default NonEvmTokens;
