import React, { useCallback, useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { strings } from '../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { newAssetTransaction } from '../../../actions/transaction';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectNativeCurrencyByChainId,
  selectSelectedNetworkClientId,
  selectTicker,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../selectors/tokenRatesController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import {
  selectContractBalances,
  selectTokensBalances,
} from '../../../selectors/tokenBalancesController';
import {
  selectSelectedInternalAccountAddress,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../selectors/accountsController';
import Logger from '../../../util/Logger';
import { safeToChecksumAddress } from '../../../util/address';
import {
  balanceToFiat,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  toHexadecimal,
  weiToFiat,
} from '../../../util/number';
import { getEther } from '../../../util/transactions';
import Text from '../../Base/Text';
import { createWebviewNavDetails } from '../../Views/SimpleWebview';
import useTokenHistoricalPrices, {
  TimePeriod,
} from '../../hooks/useTokenHistoricalPrices';
import Balance from './Balance';
import ChartNavigationButton from './ChartNavigationButton';
import Price from './Price';
import styleSheet from './AssetOverview.styles';
import { useStyles } from '../../../component-library/hooks';
import { QRTabSwitcherScreens } from '../../../components/Views/QRTabSwitcher';
import Routes from '../../../constants/navigation/Routes';
import TokenDetails from './TokenDetails';
import { RootState } from '../../../reducers';
import useGoToBridge from '../Bridge/utils/useGoToBridge';
import { swapsUtils } from '@metamask/swaps-controller';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { createBuyNavigationDetails } from '../Ramp/routes/utils';
import { TokenI } from '../Tokens/types';
import AssetDetailsActions from '../../../components/Views/AssetDetails/AssetDetailsActions';

interface AssetOverviewProps {
  asset: TokenI;
  displayBuyButton?: boolean;
  displaySwapsButton?: boolean;
  swapsIsLive?: boolean;
}

const AssetOverview: React.FC<AssetOverviewProps> = ({
  asset,
  displayBuyButton,
  displaySwapsButton,
  swapsIsLive,
}: AssetOverviewProps) => {
  const navigation = useNavigation();
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('1d');
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const conversionRate = useSelector(selectConversionRate);
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );
  const goToBridge = useGoToBridge('TokenDetails');
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { trackEvent, createEventBuilder } = useMetrics();
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const tokenBalances = useSelector(selectContractBalances);
  const selectedChainId = useSelector((state: RootState) =>
    selectChainId(state),
  );
  const selectedTicker = useSelector((state: RootState) => selectTicker(state));

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );

  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const chainId = isPortfolioViewEnabled()
    ? (asset.chainId as Hex)
    : selectedChainId;
  const ticker = isPortfolioViewEnabled() ? nativeCurrency : selectedTicker;
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  let currentAddress: Hex;

  if (isPortfolioViewEnabled()) {
    currentAddress = asset.address as Hex;
  } else {
    currentAddress = asset.isETH
      ? getNativeTokenAddress(chainId as Hex)
      : (asset.address as Hex);
  }

  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    address: currentAddress,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  useEffect(() => {
    const { SwapsController } = Engine.context;
    const fetchTokenWithCache = async () => {
      try {
        await SwapsController.fetchTokenWithCache({
          networkClientId: selectedNetworkClientId,
        });
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        Logger.error(
          error,
          'Swaps: error while fetching tokens with cache in AssetOverview',
        );
      }
    };
    fetchTokenWithCache();
  }, [selectedNetworkClientId]);

  const onReceive = () => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Receive,
      disableTabber: true,
    });
  };

  const handleSwapNavigation = useCallback(() => {
    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: asset.address ?? swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
        sourcePage: 'MainView',
        chainId: asset.chainId,
      },
    });
  }, [navigation, asset.address, asset.chainId]);

  const onSend = async () => {
    if (isPortfolioViewEnabled()) {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      if (asset.chainId !== selectedChainId) {
        const { NetworkController } = Engine.context;
        const networkConfiguration =
          NetworkController.getNetworkConfigurationByChainId(
            asset.chainId as Hex,
          );

        const networkClientId =
          networkConfiguration?.rpcEndpoints?.[
            networkConfiguration.defaultRpcEndpointIndex
          ]?.networkClientId;

        await NetworkController.setActiveNetwork(networkClientId as string);
      }
    }
    if ((asset.isETH || asset.isNative) && ticker) {
      dispatch(newAssetTransaction(getEther(ticker)));
    } else {
      dispatch(newAssetTransaction(asset));
    }
    navigation.navigate('SendFlowView', {});
  };

  const goToSwaps = useCallback(() => {
    if (isPortfolioViewEnabled()) {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
      if (asset.chainId !== selectedChainId) {
        const { NetworkController } = Engine.context;
        const networkConfiguration =
          NetworkController.getNetworkConfigurationByChainId(
            asset.chainId as Hex,
          );

        const networkClientId =
          networkConfiguration?.rpcEndpoints?.[
            networkConfiguration.defaultRpcEndpointIndex
          ]?.networkClientId;

        NetworkController.setActiveNetwork(networkClientId as string).then(
          () => {
            setTimeout(() => {
              handleSwapNavigation();
            }, 500);
          },
        );
      } else {
        handleSwapNavigation();
      }
    } else {
      handleSwapNavigation();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_BUTTON_CLICKED)
          .addProperties({
            text: 'Swap',
            tokenSymbol: '',
            location: 'TokenDetails',
            chain_id: getDecimalChainId(asset.chainId),
          })
          .build(),
      );
    }
  }, [
    navigation,
    asset.chainId,
    selectedChainId,
    trackEvent,
    createEventBuilder,
    handleSwapNavigation,
  ]);

  const onBuy = () => {
    navigation.navigate(
      ...createBuyNavigationDetails({
        address: asset.address,
        chainId: getDecimalChainId(chainId),
      }),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BUY_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'TokenDetails',
          chain_id_destination: getDecimalChainId(chainId),
        })
        .build(),
    );
  };

  const goToBrowserUrl = (url: string) => {
    const [screen, params] = createWebviewNavDetails({
      url,
    });

    // TODO: params should not have to be cast here
    navigation.navigate(screen, params as Record<string, unknown>);
  };

  const renderWarning = () => (
    <View style={styles.warningWrapper}>
      <TouchableOpacity
        onPress={() => goToBrowserUrl(AppConstants.URLS.TOKEN_BALANCE)}
      >
        <Text style={styles.warning}>
          {strings('asset_overview.were_unable')} {(asset as TokenI).symbol}{' '}
          {strings('asset_overview.balance')}{' '}
          <Text style={styles.warningLinks}>
            {strings('asset_overview.troubleshooting_missing')}
          </Text>{' '}
          {strings('asset_overview.for_help')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleSelectTimePeriod = useCallback((_timePeriod: TimePeriod) => {
    setTimePeriod(_timePeriod);
  }, []);

  const renderChartNavigationButton = useCallback(
    () =>
      (['1d', '1w', '1m', '3m', '1y', '3y'] as TimePeriod[]).map((label) => (
        <ChartNavigationButton
          key={label}
          label={strings(
            `asset_overview.chart_time_period_navigation.${label}`,
          )}
          onPress={() => handleSelectTimePeriod(label)}
          selected={timePeriod === label}
        />
      )),
    [handleSelectTimePeriod, timePeriod],
  );
  const itemAddress = safeToChecksumAddress(asset.address);

  let exchangeRate: number | undefined;
  if (!isPortfolioViewEnabled()) {
    exchangeRate = itemAddress
      ? tokenExchangeRates?.[itemAddress as Hex]?.price
      : undefined;
  } else {
    const currentChainId = chainId as Hex;
    exchangeRate =
      allTokenMarketData?.[currentChainId]?.[itemAddress as Hex]?.price;
  }

  let balance, balanceFiat;
  if (asset.isETH || asset.isNative) {
    balance = renderFromWei(
      //@ts-expect-error - This should be fixed at the accountsController selector level, ongoing discussion
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );
    balanceFiat = weiToFiat(
      hexToBN(
        //@ts-expect-error - This should be fixed at the accountsController selector level, ongoing discussion
        accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
      ),
      conversionRate,
      currentCurrency,
    );
  } else {
    const multiChainTokenBalanceHex =
      itemAddress &&
      multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
        chainId as Hex
      ]?.[itemAddress as Hex];

    const selectedTokenBalanceHex =
      itemAddress && tokenBalances?.[itemAddress as Hex];

    const tokenBalanceHex = isPortfolioViewEnabled()
      ? multiChainTokenBalanceHex
      : selectedTokenBalanceHex;

    balance =
      itemAddress && tokenBalanceHex
        ? renderFromTokenMinimalUnit(tokenBalanceHex, asset.decimals)
        : 0;
    balanceFiat = balanceToFiat(
      balance,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );
  }

  let mainBalance, secondaryBalance;
  if (!isPortfolioViewEnabled()) {
    if (primaryCurrency === 'ETH') {
      mainBalance = `${balance} ${asset.symbol}`;
      secondaryBalance = balanceFiat;
    } else {
      mainBalance = !balanceFiat ? `${balance} ${asset.symbol}` : balanceFiat;
      secondaryBalance = !balanceFiat
        ? balanceFiat
        : `${balance} ${asset.symbol}`;
    }
  } else {
    mainBalance = `${balance} ${asset.isETH ? asset.ticker : asset.symbol}`;
    secondaryBalance = asset.balanceFiat || '';
  }

  let currentPrice = 0;
  let priceDiff = 0;

  if (!isPortfolioViewEnabled()) {
    if (asset.isETH) {
      currentPrice = conversionRate || 0;
    } else if (exchangeRate && conversionRate) {
      currentPrice = exchangeRate * conversionRate;
    }
  } else {
    const tickerConversionRate =
      conversionRateByTicker?.[nativeCurrency]?.conversionRate ?? 0;
    currentPrice =
      exchangeRate && tickerConversionRate
        ? exchangeRate * tickerConversionRate
        : 0;
  }

  const comparePrice = prices[0]?.[1] || 0;
  if (currentPrice !== undefined && currentPrice !== null) {
    priceDiff = currentPrice - comparePrice;
  }

  return (
    <View style={styles.wrapper} testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {asset.hasBalanceError ? (
        renderWarning()
      ) : (
        <View>
          <Price
            asset={asset}
            prices={prices}
            priceDiff={priceDiff}
            currentCurrency={currentCurrency}
            currentPrice={currentPrice}
            comparePrice={comparePrice}
            isLoading={isLoading}
            timePeriod={timePeriod}
          />
          <View style={styles.chartNavigationWrapper}>
            {renderChartNavigationButton()}
          </View>
          <AssetDetailsActions
            displayBuyButton={displayBuyButton}
            displaySwapsButton={displaySwapsButton}
            swapsIsLive={swapsIsLive}
            goToBridge={goToBridge}
            goToSwaps={goToSwaps}
            onBuy={onBuy}
            onReceive={onReceive}
            onSend={onSend}
          />
          <Balance
            asset={asset}
            mainBalance={mainBalance}
            secondaryBalance={secondaryBalance}
          />
          <View style={styles.tokenDetailsWrapper}>
            <TokenDetails asset={asset} />
          </View>
          {/*  Commented out since we are going to re enable it after curating content */}
          {/* <View style={styles.aboutWrapper}>
            // <AboutAsset asset={asset} chainId={chainId} />
          </View> */}
        </View>
      )}
    </View>
  );
};

export default AssetOverview;
