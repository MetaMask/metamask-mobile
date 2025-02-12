import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectMultichainDefaultToken,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainConversionRate,
  selectMultichainShouldShowFiat,
} from '../../../selectors/multichain';
import { TokenList } from '../Tokens/TokenList';
import { TokenI } from '../Tokens/types';
import { renderFiat } from '../../../util/number';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { Image } from 'react-native';
import Engine from '../../../core/Engine/Engine';
import Logger from '../../../util/Logger';
import {
  MULTICHAIN_PROVIDER_CONFIGS,
  MULTICHAIN_TOKEN_IMAGES,
} from '../../../core/Multichain/constants';
import {
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkName,
} from '../../../selectors/multichainNetworkController';
import { CaipChainId } from '@metamask/utils';

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
  const nonEvmNetworkChainId = useSelector(selectSelectedNonEvmNetworkChainId);
  const nonEvmNetworkName = useSelector(selectSelectedNonEvmNetworkName);

  function getMultiChainFiatBalance(): string {
    if (conversionRate) {
      const multichainBalance = Number(nativeTokenBalance);
      const fiatBalance = multichainBalance * conversionRate;
      return renderFiat(fiatBalance, currentCurrency);
    }
    return `${nativeTokenBalance} ${symbol}`;
  }

  // Get the token image based on the network
  const getTokenImage = () => {
    const imageSource =
      MULTICHAIN_TOKEN_IMAGES[
        nonEvmNetworkChainId as keyof typeof MULTICHAIN_TOKEN_IMAGES
      ];
    return imageSource ? Image.resolveAssetSource(imageSource).uri : '';
  };

  const getDecimalsByChainId = (chainId: CaipChainId) =>
    MULTICHAIN_PROVIDER_CONFIGS[chainId]?.decimal;

  // Format the token data to match TokenI interface
  const formattedTokens: TokenI[] = [
    {
      address: '', // Non-EVM chains don't use EVM-style addresses for native tokens
      aggregators: [],
      decimals: getDecimalsByChainId(nonEvmNetworkChainId),
      image: getTokenImage(),
      name: nonEvmNetworkName,
      symbol: defaultToken.symbol,
      balance: nativeTokenBalance || '0',
      balanceFiat: shouldShowFiat ? getMultiChainFiatBalance() : '',
      logo: getTokenImage(),
      isETH: false,
      isNative: true,
      ticker: defaultToken.symbol,
    },
  ];

  const onRefresh = () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);

      const { MultichainBalancesController } = Engine.context;

      const actions = [MultichainBalancesController.updateBalances()];
      await Promise.all(actions).catch((error) => {
        Logger.error(error, 'Error while refreshing NonEvm tokens');
      });
      setRefreshing(false);
    });
  };

  const showRemoveMenu = useCallback(() => {
    // Native tokens can't be removed in non-EVM chains
  }, []);

  const goToAddToken = useCallback(() => {
    // Token management not supported for non-EVM chains yet
  }, []);

  return (
    <>
      <TokenList
        tokens={formattedTokens}
        refreshing={refreshing}
        isAddTokenEnabled={false}
        onRefresh={onRefresh}
        showRemoveMenu={showRemoveMenu}
        goToAddToken={goToAddToken}
        showPercentageChange={false}
        showNetworkBadge={false}
      />
    </>
  );
};

export default NonEvmTokens;
