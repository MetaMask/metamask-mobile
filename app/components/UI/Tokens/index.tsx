import React, {
  useRef,
  useState,
  LegacyRef,
  useMemo,
  memo,
  useCallback,
} from 'react';
import { Hex } from '@metamask/utils';
import { View, Text } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { IMetaMetricsEvent, MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNativeNetworkCurrencies,
} from '../../../selectors/networkController';
import { getDecimalChainId, isTestNet } from '../../../util/networks';
import createStyles from './styles';
import { TokenList } from './TokenList';
import { TokenI } from './types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import { sortAssets } from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from './TokensBottomSheet';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { selectNetworkName } from '../../../selectors/networkInfos';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  selectEvmTokenFiatBalances,
  selectEvmTokens,
} from '../../../selectors/multichain';
import { TraceName, endTrace, trace } from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';

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

interface RemoveEvmTokenProps {
  tokenToRemove: TokenI;
  currentChainId: string;
  trackEvent: (event: ITrackingEvent, saveDataRecording?: boolean) => void;
  strings: (key: string, args?: Record<string, unknown>) => string;
  getDecimalChainId: (chainId: string) => number;
  createEventBuilder: (event: IMetaMetricsEvent) => MetricsEventBuilder;
}

export const removeEvmToken = async ({
  tokenToRemove,
  currentChainId,
  trackEvent,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  strings,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  getDecimalChainId,
  createEventBuilder,
}: RemoveEvmTokenProps) => {
  const { TokensController, NetworkController } = Engine.context;
  const chainId = tokenToRemove?.chainId;
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

interface RefreshTokensProps {
  isEvmSelected: boolean;
  setRefreshing: (refreshing: boolean) => void;
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
  nativeCurrencies: string[];
}

export const refreshEvmTokens = async ({
  isEvmSelected,
  setRefreshing,
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
}: RefreshTokensProps) => {
  if (!isEvmSelected) {
    return;
  }

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
      chainIds: Object.keys(evmNetworkConfigurationsByChainId) as Hex[],
    }),
    TokenBalancesController.updateBalances({
      chainIds: Object.keys(evmNetworkConfigurationsByChainId) as Hex[],
    }),
    AccountTrackerController.refresh(),
    CurrencyRateController.updateExchangeRate(nativeCurrencies),
    ...Object.values(evmNetworkConfigurationsByChainId).map((network) =>
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
};

const Tokens = memo(() => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId);
  const nativeCurrencies = useSelector(selectNativeNetworkCurrencies);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const evmTokens = useSelector(selectEvmTokens);
  const tokenFiatBalances = useSelector(selectEvmTokenFiatBalances);

  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);

  const styles = createStyles(colors);

  const tokensList = useMemo((): TokenI[] => {
    trace({
      name: TraceName.Tokens,
      tags: getTraceTags(store.getState()),
    });

    // we need to calculate fiat balances here in order to sort by descending fiat amount
    const tokensWithBalances = evmTokens.map((token, i) => ({
      ...token,
      tokenFiatAmount: tokenFiatBalances[i],
    }));

    const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);
    endTrace({
      name: TraceName.Tokens,
    });
    return tokensSorted;
  }, [evmTokens, tokenFiatBalances, tokenSortConfig]);

  const showRemoveMenu = (token: TokenI) => {
    if (actionSheet.current) {
      setTokenToRemove(token);
      actionSheet.current.show();
    }
  };

  const showFilterControls = useCallback(() => {
    navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
  }, [navigation]);

  const showSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(() => {
      refreshEvmTokens({
        isEvmSelected,
        setRefreshing,
        evmNetworkConfigurationsByChainId,
        nativeCurrencies,
      });
    });
  }, [
    isEvmSelected,
    setRefreshing,
    evmNetworkConfigurationsByChainId,
    nativeCurrencies,
  ]);

  const removeToken = useCallback(async () => {
    if (tokenToRemove) {
      await removeEvmToken({
        tokenToRemove,
        currentChainId,
        trackEvent,
        strings,
        getDecimalChainId,
        createEventBuilder, // Now passed as a prop
      });
    }
  }, [tokenToRemove, currentChainId, trackEvent, createEventBuilder]);

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
    <AssetPollingProvider>
      <View
        style={styles.wrapper}
        testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
      >
        <View style={styles.actionBarWrapper}>
          <View style={styles.controlButtonOuterWrapper}>
            <ButtonBase
              testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
              label={
                <Text style={styles.controlButtonText} numberOfLines={1}>
                  {isAllNetworks && isPopularNetwork && isEvmSelected
                    ? `${strings('app_settings.popular')} ${strings(
                        'app_settings.networks',
                      )}`
                    : networkName ?? strings('wallet.current_network')}
                </Text>
              }
              isDisabled={isTestNet(currentChainId) || !isPopularNetwork}
              onPress={isEvmSelected ? showFilterControls : () => null}
              endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
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
    </AssetPollingProvider>
  );
});

export default React.memo(Tokens);
