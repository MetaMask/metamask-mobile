import React, { useCallback, useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/TokenOverview.selectors';
import { newAssetTransaction } from '../../../actions/transaction';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import {
  selectChainId,
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
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
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
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { createBuyNavigationDetails } from '../Ramp/routes/utils';
import { TokenI } from '../Tokens/types';
import AssetDetailsActions from '../../../components/Views/AssetDetails/AssetDetailsActions';

const isPortfolioViewEnabled = process.env.PORTFOLIO_VIEW === 'true';

interface AssetOverviewProps {
  navigation: {
    navigate: (route: string, params: Record<string, unknown>) => void;
  };
  asset: TokenI;
  displayBuyButton?: boolean;
  displaySwapsButton?: boolean;
}

const AssetOverview: React.FC<AssetOverviewProps> = ({
  navigation,
  asset,
  displayBuyButton,
  displaySwapsButton,
}: AssetOverviewProps) => {
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('1d');
  const conversionRate = useSelector(selectConversionRate);
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );
  const goToBridge = useGoToBridge('TokenDetails');
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const { trackEvent } = useMetrics();
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const tokenExchangeRateByChainId = useSelector(selectTokenMarketData);
  const tokenBalances = useSelector(selectContractBalances);
  const selectedChainId = useSelector((state: RootState) =>
    selectChainId(state),
  );
  const selectedTicker = useSelector((state: RootState) => selectTicker(state));

  const chainId = isPortfolioViewEnabled
    ? (asset.chainId as Hex)
    : selectedChainId;
  const ticker = isPortfolioViewEnabled ? asset.symbol : selectedTicker;

  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    address: asset.address,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  useEffect(() => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { SwapsController } = Engine.context as { SwapsController: any };
    const fetchTokenWithCache = async () => {
      try {
        await SwapsController.fetchTokenWithCache();
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
  }, []);

  const onReceive = () => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Receive,
      disableTabber: true,
    });
  };

  const onSend = async () => {
    if (asset.isETH && ticker) {
      dispatch(newAssetTransaction(getEther(ticker)));
    } else {
      dispatch(newAssetTransaction(asset));
    }
    navigation.navigate('SendFlowView', {});
  };

  const goToSwaps = () => {
    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
        sourcePage: 'MainView',
      },
    });
    trackEvent(MetaMetricsEvents.SWAP_BUTTON_CLICKED, {
      text: 'Swap',
      tokenSymbol: '',
      location: 'TokenDetails',
      chain_id: getDecimalChainId(chainId),
    });
  };
  const onBuy = () => {
    const [route, params] = createBuyNavigationDetails();
    navigation.navigate(route, params || {});
    trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
      text: 'Buy',
      location: 'TokenDetails',
      chain_id_destination: getDecimalChainId(chainId),
    });
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

  let exchangeRate;
  if (!isPortfolioViewEnabled) {
    exchangeRate = itemAddress
      ? tokenExchangeRates?.[itemAddress]?.price
      : undefined;
  } else {
    exchangeRate =
      tokenExchangeRateByChainId?.[chainId]?.[itemAddress as Hex]?.price;
  }

  let balance, balanceFiat;
  if (!isPortfolioViewEnabled) {
    if (asset.isETH) {
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
      balance =
        itemAddress && tokenBalances?.[itemAddress]
          ? renderFromTokenMinimalUnit(
              tokenBalances[itemAddress],
              asset.decimals,
            )
          : 0;
      balanceFiat = balanceToFiat(
        balance,
        conversionRateByTicker[asset.symbol].conversionRate,
        exchangeRate,
        currentCurrency,
      );
    }
  } else {
    balance = asset.balance;
    balanceFiat = asset.balanceFiat;
  }

  let mainBalance, secondaryBalance;
  if (!isPortfolioViewEnabled) {
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
    mainBalance = `${balance} ${asset.symbol}`;
    secondaryBalance = asset.balanceFiat;
  }

  let currentPrice = 0;
  let priceDiff = 0;

  if (!isPortfolioViewEnabled) {
    if (asset.isETH) {
      currentPrice = conversionRate || 0;
    } else if (exchangeRate && conversionRate) {
      currentPrice = exchangeRate * conversionRate;
    }
  } else {
    const tickerConversionRate =
      conversionRateByTicker[asset.symbol].conversionRate;
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
