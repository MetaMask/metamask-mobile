import React, { useRef, useState, LegacyRef, useMemo } from 'react';
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
  selectTokenNetworkFilter,
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
  const selectedChainId = useSelector(selectChainId);
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
  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);

  const styles = createStyles(colors);

  const tokensList = useMemo((): TokenI[] => {
    // if it is not popular network, display tokens only for current network
    const filteredAssetsParam = isPopularNetwork
      ? tokenNetworkFilter
      : { [currentChainId]: true };
    if (isPortfolioViewEnabled()) {
      // MultiChain implementation
      const allTokens = Object.values(
        selectedAccountTokensChains,
      ).flat() as TokenI[];
      /*
        If hideZeroBalanceTokens is ON and user is on "all Networks" we respect the setting and filter native and ERC20 tokens when zero
        If user is on "current Network" we want to show native tokens, even with zero balance
      */
      let tokensToDisplay = [];
      if (hideZeroBalanceTokens) {
        if (isUserOnCurrentNetwork) {
          tokensToDisplay = allTokens.filter((curToken) => {
            const multiChainTokenBalances =
              multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
                curToken.chainId as Hex
              ];
            const balance = multiChainTokenBalances?.[curToken.address as Hex];
            return !isZero(balance) || curToken.isNative || curToken.isStaked;
          });
        } else {
          tokensToDisplay = allTokens.filter((curToken) => {
            const multiChainTokenBalances =
              multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
                curToken.chainId as Hex
              ];
            const balance =
              multiChainTokenBalances?.[curToken.address as Hex] ||
              curToken.balance;
            return !isZero(balance) || curToken.isStaked;
          });
        }
      } else {
        tokensToDisplay = allTokens;
      }

      // Then apply network filters
      const filteredAssets = filterAssets(tokensToDisplay, [
        {
          key: 'chainId',
          opts: filteredAssetsParam,
          filterCallback: 'inclusive',
        },
      ]);

      const { nativeTokens, nonNativeTokens } = filteredAssets.reduce<{
        nativeTokens: TokenI[];
        nonNativeTokens: TokenI[];
      }>(
        (
          acc: { nativeTokens: TokenI[]; nonNativeTokens: TokenI[] },
          currToken: unknown,
        ) => {
          if (
            isTestNet((currToken as TokenI & { chainId: string }).chainId) &&
            !isTestNet(currentChainId)
          ) {
            return acc;
          }
          if ((currToken as TokenI).isNative) {
            acc.nativeTokens.push(currToken as TokenI);
          } else {
            acc.nonNativeTokens.push(currToken as TokenI);
          }
          return acc;
        },
        { nativeTokens: [], nonNativeTokens: [] },
      );

      const assets = [...nativeTokens, ...nonNativeTokens];

      // Calculate fiat balances for tokens
      const tokenFiatBalances = assets.map((token) => {
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

      const tokensWithBalances = assets.map((token, i) => ({
        ...token,
        tokenFiatAmount: tokenFiatBalances[i],
      }));

      return sortAssets(tokensWithBalances, tokenSortConfig);
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

    // Sort the tokens based on tokenSortConfig
    return sortAssets(tokensWithBalances, tokenSortConfig);
  }, [
    conversionRate,
    currentCurrency,
    hideZeroBalanceTokens,
    tokenBalances,
    tokenExchangeRates,
    tokenSortConfig,
    tokens,
    // Dependencies for multichain implementation
    selectedAccountTokensChains,
    isPopularNetwork,
    tokenNetworkFilter,
    currentChainId,
    multiChainCurrencyRates,
    multiChainMarketData,
    multiChainTokenBalance,
    networkConfigurationsByChainId,
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
      } = Engine.context;

      const actions = [
        TokenDetectionController.detectTokens({
          chainIds: isPortfolioViewEnabled()
            ? (Object.keys(networkConfigurationsByChainId) as Hex[])
            : [selectedChainId],
        }),
        AccountTrackerController.refresh(),
        CurrencyRateController.updateExchangeRate(nativeCurrencies),
        ...(isPortfolioViewEnabled()
          ? Object.values(networkConfigurationsByChainId)
          : [networkConfigurationsByChainId[selectedChainId]]
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
      : selectedChainId;
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
            chain_id: getDecimalChainId(selectedChainId),
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
          chain_id: getDecimalChainId(selectedChainId),
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
