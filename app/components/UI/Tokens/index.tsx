import React, { useRef, useState, LegacyRef, useMemo, memo } from 'react';
import { Hex } from '@metamask/utils';
import { View, Text } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useSelector } from 'react-redux';
import useTokenBalancesController from '../../hooks/useTokenBalancesController/useTokenBalancesController';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { useTheme } from '../../../util/theme';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import {
  getDecimalChainId,
  isTestNet,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { isZero } from '../../../util/lodash';
import createStyles from './styles';
import { TokenList } from './TokenList';
import { TokenI, TokensI } from './types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { deriveBalanceFromAssetMarketDetails, sortAssets } from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootState } from '../../../reducers';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../selectors/tokenRatesController';
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
import { selectAccountTokensAcrossChains } from '../../../selectors/multichain';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { TraceName, endTrace, trace } from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';

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

const DEBOUNCE_DELAY = 300;

const Tokens: React.FC<TokensI> = memo(({ tokens }) => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { data: tokenBalances } = useTokenBalancesController();
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const hideZeroBalanceTokens = useSelector(
    (state: RootState) => state.settings.hideZeroBalanceTokens,
  );
  const isUserOnCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );

  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId);
  const nativeCurrencies = [
    ...new Set(
      Object.values(networkConfigurationsByChainId).map(
        (n) => n.nativeCurrency,
      ),
    ),
  ];
  const selectedAccountTokensChains = useSelector((state: RootState) =>
    isPortfolioViewEnabled() ? selectAccountTokensAcrossChains(state) : {},
  );

  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);
  const isAllNetworks = useSelector(selectIsAllNetworks);

  // multi chain
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const debouncedMultiChainMarketData = useDebouncedValue(
    multiChainMarketData,
    DEBOUNCE_DELAY,
  );

  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const debouncedMultiChainTokenBalance = useDebouncedValue(
    multiChainTokenBalance,
    DEBOUNCE_DELAY,
  );
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const debouncedMultiChainCurrencyRates = useDebouncedValue(
    multiChainCurrencyRates,
    DEBOUNCE_DELAY,
  );
  const isPopularNetwork = useSelector(selectIsPopularNetwork);

  const styles = createStyles(colors);

  const getTokensToDisplay = (allTokens: TokenI[]): TokenI[] => {
    if (hideZeroBalanceTokens) {
      const tokensToDisplay: TokenI[] = [];
      for (const curToken of allTokens) {
        const multiChainTokenBalances =
          multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
            curToken.chainId as Hex
          ];
        const balance =
          multiChainTokenBalances?.[curToken.address as Hex] ||
          curToken.balance;

        if (
          !isZero(balance) ||
          (isUserOnCurrentNetwork && (curToken.isNative || curToken.isStaked))
        ) {
          tokensToDisplay.push(curToken);
        }
      }

      return tokensToDisplay;
    }
    return allTokens;
  };

  const categorizeTokens = (filteredTokens: TokenI[]) => {
    const nativeTokens: TokenI[] = [];
    const nonNativeTokens: TokenI[] = [];

    for (const currToken of filteredTokens) {
      const token = currToken as TokenI & { chainId: string };

      // Skip tokens if they are on a test network and the current chain is not a test network
      if (isTestNet(token.chainId) && !isTestNet(currentChainId)) {
        continue;
      }

      // Categorize tokens as native or non-native
      if (token.isNative) {
        nativeTokens.push(token);
      } else {
        nonNativeTokens.push(token);
      }
    }

    return [...nativeTokens, ...nonNativeTokens];
  };

  const calculateFiatBalances = (assets: TokenI[]) =>
    assets.map((token) => {
      const chainId = token.chainId as Hex;
      const multiChainExchangeRates = multiChainMarketData?.[chainId];
      const multiChainTokenBalances =
        multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
          chainId
        ];
      const nativeCurrency =
        networkConfigurationsByChainId[chainId].nativeCurrency;
      const multiChainConversionRate =
        multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

      return token.isETH || token.isNative
        ? parseFloat(token.balance) * multiChainConversionRate
        : deriveBalanceFromAssetMarketDetails(
            token,
            multiChainExchangeRates || {},
            multiChainTokenBalances || {},
            multiChainConversionRate || 0,
            currentCurrency || '',
          ).balanceFiatCalculation;
    });

  const filterTokensByNetwork = (tokensToDisplay: TokenI[]): TokenI[] => {
    if (isAllNetworks && isPopularNetwork) {
      return tokensToDisplay;
    }
    return tokensToDisplay.filter((token) => token.chainId === currentChainId);
  };

  const tokensList = useMemo((): TokenI[] => {
    trace({
      name: TraceName.Tokens,
      tags: getTraceTags(store.getState()),
    });
    if (isPortfolioViewEnabled()) {
      trace({
        name: TraceName.Tokens,
        tags: getTraceTags(store.getState()),
      });

      // MultiChain implementation
      const allTokens = Object.values(
        selectedAccountTokensChains,
      ).flat() as TokenI[];

      /*
        If hideZeroBalanceTokens is ON and user is on "all Networks" we respect the setting and filter native and ERC20 tokens when zero
        If user is on "current Network" we want to show native tokens, even with zero balance
      */
      const tokensToDisplay = getTokensToDisplay(allTokens);

      const filteredTokens: TokenI[] = filterTokensByNetwork(tokensToDisplay);

      const assets = categorizeTokens(filteredTokens);

      // Calculate fiat balances for tokens
      const tokenFiatBalances = calculateFiatBalances(assets);

      const tokensWithBalances = assets.map((token, i) => ({
        ...token,
        tokenFiatAmount: tokenFiatBalances[i],
      }));

      const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);
      endTrace({
        name: TraceName.Tokens,
      });
      return tokensSorted;
    }
    // Previous implementation
    // Filter tokens based on hideZeroBalanceTokens flag
    const tokensToDisplay = hideZeroBalanceTokens
      ? tokens.filter(
          ({ address, isETH }) => !isZero(tokenBalances[address]) || isETH,
        )
      : tokens;

    // Calculate fiat balances for tokens
    const tokenFiatBalances = conversionRate
      ? tokensToDisplay.map((asset) =>
          asset.isETH
            ? parseFloat(asset.balance) * conversionRate
            : deriveBalanceFromAssetMarketDetails(
                asset,
                tokenExchangeRates || {},
                tokenBalances || {},
                conversionRate || 0,
                currentCurrency || '',
              ).balanceFiatCalculation,
        )
      : [];

    // Combine tokens with their fiat balances
    // tokenFiatAmount is the key in PreferencesController to sort by when sorting by declining fiat balance
    // this key in the controller is also used by extension, so this is for consistency in syntax and config
    // actual balance rendering for each token list item happens in TokenListItem component
    const tokensWithBalances = tokensToDisplay.map((token, i) => ({
      ...token,
      tokenFiatAmount: tokenFiatBalances[i],
    }));

    const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);
    endTrace({
      name: TraceName.Tokens,
    });
    return tokensSorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hideZeroBalanceTokens,
    tokenSortConfig,
    // Dependencies for multichain implementation
    debouncedMultiChainTokenBalance,
    debouncedMultiChainMarketData,
    debouncedMultiChainCurrencyRates,
    selectedAccountTokensChains,
    selectedInternalAccountAddress,
    isUserOnCurrentNetwork,
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
        TokenBalancesController,
      } = Engine.context;

      const actions = [
        TokenDetectionController.detectTokens({
          chainIds: isPortfolioViewEnabled()
            ? (Object.keys(networkConfigurationsByChainId) as Hex[])
            : [currentChainId],
        }),

        TokenBalancesController.updateBalances({
          chainIds: isPortfolioViewEnabled()
            ? (Object.keys(networkConfigurationsByChainId) as Hex[])
            : [currentChainId],
        }),
        AccountTrackerController.refresh(),
        CurrencyRateController.updateExchangeRate(nativeCurrencies),
        ...(isPortfolioViewEnabled()
          ? Object.values(networkConfigurationsByChainId)
          : [networkConfigurationsByChainId[currentChainId]]
        ).map((network) =>
          TokenRatesController.updateExchangeRatesByChainId({
            chainId: network.chainId,
            nativeCurrency: network.nativeCurrency,
          }),
        ),
      ];
      await Promise.all(actions).catch((error) => {
        Logger.error(error, 'Error while refreshing tokens');
      });
      setRefreshing(false);
    });
  };

  const removeToken = async () => {
    const { TokensController, NetworkController } = Engine.context;
    const chainId = isPortfolioViewEnabled()
      ? tokenToRemove?.chainId
      : currentChainId;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      chainId as Hex,
    );
    const tokenAddress = tokenToRemove?.address || '';

    const symbol = tokenToRemove?.symbol;
    try {
      await TokensController.ignoreTokens([tokenAddress], networkClientId);
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
            chain_id: getDecimalChainId(currentChainId),
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
          chain_id: getDecimalChainId(currentChainId),
        })
        .build(),
    );
    setIsAddTokenEnabled(true);
  };

  const onActionSheetPress = (index: number) =>
    index === 0 ? removeToken() : null;

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      <View style={styles.actionBarWrapper}>
        {isPortfolioViewEnabled() ? (
          <View style={styles.controlButtonOuterWrapper}>
            <ButtonBase
              testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
              label={
                <Text style={styles.controlButtonText} numberOfLines={1}>
                  {isAllNetworks && isPopularNetwork
                    ? `${strings('app_settings.popular')} ${strings(
                        'app_settings.networks',
                      )}`
                    : networkName ?? strings('wallet.current_network')}
                </Text>
              }
              isDisabled={isTestNet(currentChainId) || !isPopularNetwork}
              onPress={showFilterControls}
              endIconName={IconName.ArrowDown}
              style={
                isTestNet(currentChainId) || !isPopularNetwork
                  ? styles.controlButtonDisabled
                  : styles.controlButton
              }
              disabled={isTestNet(currentChainId) || !isPopularNetwork}
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
      {tokensList && (
        <TokenList
          tokens={tokensList}
          refreshing={refreshing}
          isAddTokenEnabled={isAddTokenEnabled}
          onRefresh={onRefresh}
          showRemoveMenu={showRemoveMenu}
          goToAddToken={goToAddToken}
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
});

export default React.memo(Tokens);
