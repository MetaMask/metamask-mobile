import React, { useRef, useState, LegacyRef, useMemo } from 'react';
import { View, Text } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useSelector } from 'react-redux';
import { Token } from '@metamask/assets-controllers';
import {
  selectProviderConfig,
  ProviderConfig,
} from '../../../selectors/networkController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import useTokenBalancesController from '../../hooks/useTokenBalancesController/useTokenBalancesController';
import { useTheme } from '../../../util/theme';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import { isZero } from '../../../util/lodash';
import createStyles from './styles';
import { TokenList } from './TokenList';
import { TokensI } from './types';
import { AssetType } from '../SimulationDetails/types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  selectTokenNetworkFilter,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { deriveBalanceFromAssetMarketDetails, sortAssets } from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootState } from '../../../reducers';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectMarketData } from '../../../selectors/tokenRatesController';
import {
  selectConversionRate,
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from './TokensBottomSheet';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { selectNetworkName } from '../../../selectors/networkInfos';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { filterAssets } from './util/filterAssets';

// this will be imported from TokenRatesController when it is exported from there
// PR: https://github.com/MetaMask/core/pull/4622
export interface MarketDataDetails {
  tokenAddress: `0x${string}`;
  value: number;
  currency: string;
  allTimeHigh: number;
  allTimeLow: number;
  circulatingSupply: number;
  dilutedMarketCap: number;
  high1d: number;
  low1d: number;
  marketCap: number;
  marketCapPercentChange1d: number;
  price: number;
  priceChange1d: number;
  pricePercentChange1d: number;
  pricePercentChange1h: number;
  pricePercentChange1y: number;
  pricePercentChange7d: number;
  pricePercentChange14d: number;
  pricePercentChange30d: number;
  pricePercentChange200d: number;
  totalVolume: number;
}

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface TokenI extends Token {
  chainId: string;
  isNative: boolean;
  balance: number | string;
  balanceFiat: string;
  logo: null | string;
  isETH: boolean;
  tokenFiatAmount?: number;
  string?: string;
}

const Tokens: React.FC<TokensI> = ({ tokens }) => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { data: tokenBalances } = useTokenBalancesController();
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const allNetworks = useSelector(selectNetworkConfigurations);
  const chainId = useSelector(selectChainId);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const hideZeroBalanceTokens = useSelector(
    (state: RootState) => state.settings.hideZeroBalanceTokens,
  );

  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const nativeCurrencies = [
    ...new Set(
      Object.values(networkConfigurationsByChainId).map(
        (n) => n.nativeCurrency,
      ),
    ),
  ];

  const allTokens = useSelector(selectAllTokens);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const marketData = useSelector(selectMarketData);

  const currencyRates = useSelector(selectCurrencyRates);
  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);

  const styles = createStyles(colors);

  const getNativeTokenInfo = (chainId: string) => {
    const networkConfig = allNetworks?.[chainId as `0x${string}`];

    if (networkConfig) {
      const symbol = networkConfig.nativeCurrency || AssetType.Native;
      const decimals = 18;
      const name = networkConfig.name || 'Native Token';

      return {
        symbol,
        decimals,
        name,
      };
    }

    if (providerConfig?.chainId === chainId) {
      const symbol = providerConfig.ticker || AssetType.Native;
      // const decimals = providerConfig.nativeCurrency?.decimals || 18; // TODO: missing from providerConfig
      const decimals = 18;
      const name = providerConfig.nickname || 'Native Token';

      return {
        symbol,
        decimals,
        name,
      };
    }

    return { symbol: AssetType.Native, decimals: 18, name: 'Native Token' };
  };

  const getSelectedAccountNativeTokenCachedBalanceByChainId = () => {
    const selectedAddress: string =
      selectedAccount?.address?.toLowerCase() || '';

    if (!selectedAddress) {
      return {};
    }
    const balancesByChainId: Record<string, string> = {};
    for (const [chainId, accounts] of Object.entries(accountsByChainId || {})) {
      const accountEntry = Object.entries(accounts).find(
        ([address]) => address.toLowerCase() === selectedAddress,
      );

      if (accountEntry) {
        const [_, accountData] = accountEntry;
        balancesByChainId[chainId] = accountData.balance;
      }
    }
    return balancesByChainId;
  };

  const getSelectedAccountTokensAcrossChains = () => {
    const selectedAddress: string = selectedAccount?.address || '';
    const tokensByChain: Record<string, TokenI[]> = {};
    const nativeTokenBalancesByChainId =
      getSelectedAccountNativeTokenCachedBalanceByChainId();

    const chainIds = new Set([
      ...Object.keys(allTokens || {}),
      ...Object.keys(nativeTokenBalancesByChainId || {}),
    ]);

    chainIds.forEach((chainId: string) => {
      const hexChainId = chainId as `0x${string}`;
      if (!tokensByChain[hexChainId]) {
        tokensByChain[hexChainId] = [];
      }

      if (allTokens[hexChainId]?.[selectedAddress]) {
        allTokens[hexChainId][selectedAddress].forEach((token: Token) => {
          const tokenWithChain: TokenI = {
            ...token,
            chainId,
            isNative: false,
            balance: '0',
            balanceFiat: '0',
            logo: null,
            isETH: false,
          };
          tokensByChain[chainId].push(tokenWithChain);
        });
      }
      const nativeBalance = nativeTokenBalancesByChainId[chainId];
      if (nativeBalance) {
        const nativeTokenInfo = getNativeTokenInfo(chainId);
        tokensByChain[chainId].push({
          ...nativeTokenInfo,
          address: '',
          balance: nativeBalance,
          chainId,
          isNative: true,
          balanceFiat: '0',
          logo: null,
          isETH: chainId === '0x1',
        });
      }
    });
    return tokensByChain;
  };

  const getSelectedAccountTokenBalancesAcrossChains = () => {
    const accountTokens = getSelectedAccountTokensAcrossChains();

    // TODO: read this from tokenBalances state
    function generateRandomBalance(min = 10, max = 20) {
      const factor = 100000; // 10^5 to get 5 decimal places
      const randomValue = Math.random() * (max - min) + min;
      return Math.floor(randomValue * factor) / factor;
    }

    const tokenBalancesByChain: Record<
      `0x${string}`,
      Record<string, number>
    > = {};

    Object.keys(accountTokens).forEach((chainId) => {
      tokenBalancesByChain[chainId as `0x${string}`] = {};

      accountTokens[chainId].forEach((token) => {
        const { address } = token;

        tokenBalancesByChain[chainId as `0x${string}`][address] =
          generateRandomBalance();
      });
    });

    return tokenBalancesByChain;
  };

  const consolidatedBalances = () => {
    const tokensWithBalance: any[] = [];
    const tokensAcrossChains = getSelectedAccountTokensAcrossChains();
    const tokenBalancesAcrossChains =
      getSelectedAccountTokenBalancesAcrossChains();

    Object.keys(tokensAcrossChains).forEach((chainId: string) => {
      const hexChainId = chainId as `0x${string}`;
      tokensAcrossChains[hexChainId].forEach((token: Record<string, any>) => {
        const { address } = token;

        const balance = tokenBalancesAcrossChains[hexChainId]?.[address];
        const baseCurrency = marketData[hexChainId]?.[address]?.currency;

        const tokenMarketPrice =
          marketData[hexChainId]?.[address]?.price || '0';
        const tokenExchangeRate =
          currencyRates[baseCurrency]?.conversionRate || '0';

        let tokenFiatAmount =
          Number(tokenMarketPrice) *
          Number(tokenExchangeRate) *
          Number(balance);
        if (token.isNative && currencyRates) {
          tokenFiatAmount =
            Number(currencyRates[token.symbol]?.conversionRate ?? 0) *
            Number(balance ?? 0);
        }

        tokensWithBalance.push({
          ...token,
          balance,
          tokenFiatAmount,
          chainId,
          string: balance.toString(),
        });
      });
    });

    return tokensWithBalance;
  };

  const sortedTokensList = useMemo(() => {
    const consolidatedTokensWithBalances = consolidatedBalances();
    const filteredAssets = filterAssets(consolidatedTokensWithBalances, [
      {
        key: 'chainId',
        opts: tokenNetworkFilter,
        filterCallback: 'inclusive',
      },
    ]);

    const { nativeTokens, nonNativeTokens } = filteredAssets.reduce(
      (acc, token) => {
        if (token.isNative) {
          acc.nativeTokens.push(token);
        } else {
          acc.nonNativeTokens.push(token);
        }
        return acc;
      },
      { nativeTokens: [], nonNativeTokens: [] },
    );
    return sortAssets([...nativeTokens, ...nonNativeTokens], tokenSortConfig);
  }, [
    conversionRate,
    currentCurrency,
    hideZeroBalanceTokens,
    tokenBalances,
    tokenExchangeRates,
    tokenSortConfig,
    tokenNetworkFilter,
    tokens,
  ]);

  const showRemoveMenu = (token: TokenI) => {
    if (actionSheet.current) {
      setTokenToRemove(token);
      actionSheet.current.show();
    }
  };

  const showFilterControls = () => {
    navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
  };

  const showSortControls = () => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  };

  const onRefresh = async () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);

      const {
        TokenDetectionController,
        AccountTrackerController,
        CurrencyRateController,
        TokenRatesController,
      } = Engine.context;
      const actions = [
        TokenDetectionController.detectTokens(),
        AccountTrackerController.refresh(),
        CurrencyRateController.updateExchangeRate(nativeCurrencies),
        TokenRatesController.updateExchangeRates(),
      ];
      await Promise.all(actions).catch((error) => {
        Logger.error(error, 'Error while refreshing tokens');
      });
      setRefreshing(false);
    });
  };

  const removeToken = async () => {
    const { TokensController } = Engine.context;
    const tokenAddress = tokenToRemove?.address || '';
    const symbol = tokenToRemove?.symbol;
    try {
      await TokensController.ignoreTokens([tokenAddress]);
      NotificationManager.showSimpleNotification({
        status: `simple_notification`,
        duration: 5000,
        title: strings('wallet.token_toast.token_hidden_title'),
        description: strings('wallet.token_toast.token_hidden_desc', {
          tokenSymbol: symbol,
        }),
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
          .addProperties({
            location: 'assets_list',
            token_standard: 'ERC20',
            asset_type: 'token',
            tokens: [`${symbol} - ${tokenAddress}`],
            chain_id: getDecimalChainId(chainId),
          })
          .build(),
      );
    } catch (err) {
      Logger.log(err, 'Wallet: Failed to hide token!');
    }
  };

  const goToAddToken = () => {
    setIsAddTokenEnabled(false);
    navigation.push('AddAsset', { assetType: 'token' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
        .addProperties({
          source: 'manual',
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
    setIsAddTokenEnabled(true);
  };

  const onActionSheetPress = (index: number) =>
    index === 0 ? removeToken() : null;

  const allOpts: Record<string, boolean> = {};
  Object.keys(allNetworks).forEach((chainId) => {
    allOpts[chainId] = true;
  });
  const isTokenFilterEnabled = process.env.PORTFOLIO_VIEW === '1';
  const allNetworksFilterShown =
    Object.keys(tokenNetworkFilter).length !== Object.keys(allOpts).length;

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      <View style={styles.actionBarWrapper}>
        {isTokenFilterEnabled ? (
          <View style={styles.controlButtonOuterWrapper}>
            <ButtonBase
              label={
                <Text style={styles.controlButtonText} numberOfLines={1}>
                  {allNetworksFilterShown
                    ? networkName ?? strings('wallet.current_network')
                    : strings('wallet.all_networks')}
                </Text>
              }
              onPress={showFilterControls}
              endIconName={IconName.ArrowDown}
              style={styles.controlButton}
            />
            <View style={styles.controlButtonInnerWrapper}>
              <ButtonIcon
                testID={WalletViewSelectorsIDs.SORT_BY}
                onPress={showSortControls}
                iconName={IconName.SwapVertical}
                style={styles.controlIconButton}
              />
              <ButtonIcon
                testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
                onPress={goToAddToken}
                iconName={IconName.Add}
                style={styles.controlIconButton}
              />
            </View>
          </View>
        ) : (
          <>
            <ButtonBase
              testID={WalletViewSelectorsIDs.SORT_BY}
              label={strings('wallet.sort_by')}
              onPress={showSortControls}
              endIconName={IconName.ArrowDown}
              style={styles.controlButton}
            />
            <ButtonBase
              testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
              label={strings('wallet.import')}
              onPress={goToAddToken}
              startIconName={IconName.Add}
              style={styles.controlButton}
            />
          </>
        )}
      </View>
      {sortedTokensList && (
        <TokenList
          tokens={sortedTokensList}
          refreshing={refreshing}
          isAddTokenEnabled={isAddTokenEnabled}
          onRefresh={onRefresh}
          showRemoveMenu={showRemoveMenu}
          goToAddToken={goToAddToken}
          setIsAddTokenEnabled={setIsAddTokenEnabled}
        />
      )}
      <ActionSheet
        ref={actionSheet as LegacyRef<typeof ActionSheet>}
        title={strings('wallet.remove_token_title')}
        options={[strings('wallet.remove'), strings('wallet.cancel')]}
        cancelButtonIndex={1}
        destructiveButtonIndex={0}
        onPress={onActionSheetPress}
      />
    </View>
  );
};

export default Tokens;
