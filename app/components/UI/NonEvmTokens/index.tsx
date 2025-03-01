import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectMultichainDefaultToken,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainConversionRate,
  selectMultichainShouldShowFiat,
  selectMultichainBalances,
  selectMultichainAssetsMetadata,
  selectMultichainAssets,
  selectMultichainTokenList,
} from '../../../selectors/multichain';
import { TokenList } from '../Tokens/TokenList';
import { TokenI } from '../Tokens/types';
import { renderFiat } from '../../../util/number';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { Image } from 'react-native';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { MULTICHAIN_TOKEN_IMAGES } from '../../../core/Multichain/constants';
import {
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkDecimals,
  selectSelectedNonEvmNetworkSymbol,
} from '../../../selectors/multichainNetworkController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { filterAssets } from '../Tokens/util/filterAssets';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import { sortAssets } from '../Tokens/util';

// We need this type to match ScrollableTabView's requirements
interface NonEvmTokensProps {
  tabLabel?: string;
}

const NonEvmTokens: React.FC<NonEvmTokensProps> = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Get all the data we need from selectors

  const nonEvmNetworkChainId = useSelector(selectSelectedNonEvmNetworkChainId);

  const selectedAccount = useSelector(selectSelectedInternalAccount);

  // function getMultiChainFiatBalance(): string {
  //   if (conversionRate) {
  //     const multichainBalance = Number(nativeTokenBalance);
  //     const fiatBalance = multichainBalance * conversionRate;
  //     return renderFiat(fiatBalance, currentCurrency);
  //   }
  //   return `${nativeTokenBalance} ${symbol}`;
  // }

  const multichainBalances = useSelector(selectMultichainBalances);
  const tokenList = useSelector(selectMultichainTokenList);
  const tokenSortConfig = useSelector(selectTokenSortConfig);

  const sortedFilteredTokens = useMemo(() => {
    if (!multichainBalances) {
      return [];
    }
    const filteredAssets: TokenI[] = filterAssets(tokenList, [
      {
        key: 'chainId',
        opts: { [nonEvmNetworkChainId]: true },
        filterCallback: 'inclusive',
      },
    ]);

    // sort filtered tokens based on the tokenSortConfig in state
    return sortAssets([...filteredAssets], tokenSortConfig);
  }, [tokenList, nonEvmNetworkChainId, tokenSortConfig, multichainBalances]);

  const onRefresh = () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);

      const { MultichainBalancesController } = Engine.context;
      if (selectedAccount) {
        const actions = [
          MultichainBalancesController.updateBalance(selectedAccount?.id),
        ];
        await Promise.all(actions).catch((error) => {
          Logger.error(error, 'Error while refreshing NonEvm tokens');
        });
      }
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
    <TokenList
      tokens={sortedFilteredTokens}
      refreshing={refreshing}
      isAddTokenEnabled={false}
      onRefresh={onRefresh}
      showRemoveMenu={showRemoveMenu}
      goToAddToken={goToAddToken}
      showPercentageChange={false}
      showNetworkBadge={false}
    />
  );
};

export default NonEvmTokens;
