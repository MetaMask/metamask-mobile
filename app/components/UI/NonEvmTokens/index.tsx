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
import { Image } from 'react-native';
import Engine from '../../../core/Engine/Engine';
import Logger from '../../../util/Logger';
import { MultichainNetworks } from '@metamask/assets-controllers';
import { MULTICHAIN_TOKEN_IMAGES } from '../../../core/Multichain/constants';

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

  // Get the token image based on the network
  const getTokenImage = () => {
    const imageSource =
      MULTICHAIN_TOKEN_IMAGES[
        network.chainId as keyof typeof MULTICHAIN_TOKEN_IMAGES
      ];
    return imageSource ? Image.resolveAssetSource(imageSource).uri : '';
  };

  // Format the token data to match TokenI interface
  const formattedTokens: TokenI[] = [
    {
      address: '', // Non-EVM chains don't use EVM-style addresses for native tokens
      aggregators: [],
      decimals: network.chainId === MultichainNetworks.Solana ? 9 : 6, // SOL uses 9 decimals, BTC uses 6
      image: getTokenImage(),
      name: network.nickname,
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
