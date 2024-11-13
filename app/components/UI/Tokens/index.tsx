import React, { useRef, useState, LegacyRef, useMemo } from 'react';
import { View } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useSelector } from 'react-redux';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
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
import { TokenI, TokensI } from './types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  selectTokenNetworkFilter,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { deriveBalanceFromAssetMarketDetails, sortAssets } from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootState } from '../../../reducers';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from './TokensBottomSheet';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { enableAllNetworksFilter } from './util/enableAllNetworksFilter';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { getSelectedAccountTokensAcrossChains } from '../../../selectors/multichain';
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
  const chainId = useSelector(selectChainId);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const hideZeroBalanceTokens = useSelector(
    (state: RootState) => state.settings.hideZeroBalanceTokens,
  );

  const selectedAccountTokensChains = useSelector(
    getSelectedAccountTokensAcrossChains,
  );
  // console.log('selected account tokens chains ->', selectedAccountTokensChains);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const networkName = useSelector(selectNetworkName);
  const allNetworks = useSelector(selectNetworkConfigurations);

  const nativeCurrencies = [
    ...new Set(
      Object.values(networkConfigurationsByChainId).map(
        (n) => n.nativeCurrency,
      ),
    ),
  ];

  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);
  const allNetworksEnabled = useMemo(
    () => enableAllNetworksFilter(allNetworks),
    [allNetworks],
  );

  const styles = createStyles(colors);

  // TODO: Original implementation
  // const tokensList = useMemo(() => {
  //   // Filter tokens based on hideZeroBalanceTokens flag
  //   const tokensToDisplay = hideZeroBalanceTokens
  //     ? tokens.filter(
  //         ({ address, isETH }) => !isZero(tokenBalances[address]) || isETH,
  //       )
  //     : tokens;

  //   const tokenFiatBalances = conversionRate
  //     ? tokensToDisplay.map((asset) =>
  //         asset.isETH
  //           ? parseFloat(asset.balance) * conversionRate
  //           : deriveBalanceFromAssetMarketDetails(
  //               asset,
  //               tokenExchangeRates,
  //               tokenBalances,
  //               conversionRate,
  //               currentCurrency,
  //             ).balanceFiatCalculation,
  //       )
  //     : [];

  //   // Combine tokens with their fiat balances
  //   // tokenFiatAmount is the key in PreferencesController to sort by when sorting by declining fiat balance
  //   // this key in the controller is also used by extension, so this is for consistency in syntax and config
  //   // actual balance rendering for each token list item happens in TokenListItem component
  //   const tokensWithBalances = tokensToDisplay.map((token, i) => ({
  //     ...token,
  //     tokenFiatAmount: tokenFiatBalances[i],
  //   }));

  //   // Sort the tokens based on tokenSortConfig
  //   return sortAssets(tokensWithBalances, tokenSortConfig);
  // }, [
  //   conversionRate,
  //   currentCurrency,
  //   hideZeroBalanceTokens,
  //   tokenBalances,
  //   tokenExchangeRates,
  //   tokenSortConfig,
  //   tokens,
  // ]);

  // TODO: Multi chain implementation
  const tokensList = useMemo(() => {
    const allTokens = Object.values(selectedAccountTokensChains).flat();
    const filteredAssets = filterAssets(allTokens, [
      {
        key: 'chainId',
        opts: tokenNetworkFilter,
        filterCallback: 'inclusive',
      },
    ]);

    const { nativeTokens, nonNativeTokens } = filteredAssets.reduce<{
      nativeTokens: TokenI[];
      nonNativeTokens: TokenI[];
    }>(
      (
        acc: { nativeTokens: TokenI[]; nonNativeTokens: TokenI[] },
        currToken: TokenI,
      ) => {
        if (currToken.isNative) {
          acc.nativeTokens.push(currToken);
        } else {
          acc.nonNativeTokens.push(currToken);
        }
        return acc;
      },
      { nativeTokens: [], nonNativeTokens: [] },
    );
    const assets = [...nativeTokens, ...nonNativeTokens];
    return sortAssets(assets, tokenSortConfig);
    // return allTokens;
  }, [
    conversionRate,
    currentCurrency,
    hideZeroBalanceTokens,
    tokenBalances,
    tokenExchangeRates,
    tokenSortConfig,
    tokenNetworkFilter,
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

  const allNetworksFilterShown =
    Object.keys(tokenNetworkFilter).length !==
    Object.keys(allNetworksEnabled).length;
  const isTokenFilterEnabled = process.env.PORTFOLIO_VIEW === 'true';

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
                allNetworksFilterShown
                  ? networkName || strings('wallet.current_network')
                  : strings('wallet.all_networks')
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
