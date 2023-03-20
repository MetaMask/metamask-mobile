import { swapsUtils } from '@metamask/swaps-controller';
import React, { useContext, useEffect, useMemo } from 'react';
import { InteractionManager, Platform, StyleSheet, View } from 'react-native';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { toggleReceiveModal } from '../../../actions/modals';
import { newAssetTransaction } from '../../../actions/transaction';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import {
  swapsLivenessSelector,
  swapsTokensObjectSelector,
} from '../../../reducers/swaps';
import { fontStyles } from '../../../styles/common';
import { safeToChecksumAddress } from '../../../util/address';
import { trackLegacyEvent } from '../../../util/analyticsV2';
import Logger from '../../../util/Logger';
import {
  balanceToFiat,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiat,
} from '../../../util/number';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { getEther } from '../../../util/transactions';
import AssetActionButton from './AssetActionButton';
import { allowedToBuy } from '../FiatOnRampAggregator';
import AssetSwapButton from '../Swaps/components/AssetSwapButton';
import { isSwapsAllowed } from '../Swaps/utils';
// import { isTestNet } from '../../../util/networks';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
// import { createWebviewNavDetails } from '../../Views/SimpleWebview';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { zeroAddress } from 'ethereumjs-util';
import { TOKEN_ASSET_OVERVIEW } from '../../../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import useTokenHistoricalPrices from '../../hooks/useTokenHistoricalPrices';
import { Asset } from './AssetOverview.types';
import PriceChart from './PriceChart';
import Price from './Price';
import ChartNavigationButton from './ChartNavigationButton';
import Balance from './Balance';
import AboutAsset from './AboutAsset/AboutAsset';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chart: {
      paddingRight: 0,
    },
    mainBalance: {
      flexDirection: 'row',
    },
    price: {
      flexDirection: 'row',
    },
    wrapper: {
      paddingTop: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    balance: {
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    amount: {
      fontSize: 30,
      color: colors.text.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    testNetAmount: {
      fontSize: 30,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    amountFiat: {
      fontSize: 18,
      color: colors.text.alternative,
      ...fontStyles.light,
      textTransform: 'uppercase',
    },
    warning: {
      borderRadius: 8,
      color: colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
      lineHeight: 20,
      borderWidth: 1,
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
      padding: 20,
    },
    warningLinks: {
      color: colors.primary.default,
    },
    chartNavigationWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 10,
      paddingVertical: 20,
    },
    balanceWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },

    balanceButtons: {
      display: 'flex',
      flexDirection: 'row',
    },
    aboutWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    },
  });

interface AssetOverviewProps {
  navigation: {
    navigate: (route: string, props?: any) => void;
  };
  asset: Asset;
}

const AssetOverview: React.FC<AssetOverviewProps> = ({
  navigation,
  asset,
}: AssetOverviewProps) => {
  const [timePeriod, setTimePeriod] = React.useState<
    '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y'
  >('1d');
  const accounts = useSelector(
    (state: RootStateOrAny) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );
  const { conversionRate, currentCurrency } = useSelector(
    (state: RootStateOrAny) =>
      state.engine.backgroundState.CurrencyRateController,
  );
  const primaryCurrency = useSelector(
    (state: RootStateOrAny) => state.settings.primaryCurrency,
  );
  const selectedAddress = useSelector(
    (state: RootStateOrAny) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const tokenBalances = useSelector(
    (state: RootStateOrAny) =>
      state.engine.backgroundState.TokenBalancesController.contractBalances,
  );
  const tokenExchangeRates = useSelector(
    (state: RootStateOrAny) =>
      state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  );
  const chainId = useSelector((state: RootStateOrAny) => selectChainId(state));
  const ticker = useSelector((state: RootStateOrAny) => selectTicker(state));
  const swapsIsLive = useSelector((state: RootStateOrAny) =>
    swapsLivenessSelector(state),
  );
  const swapsTokens = useSelector((state: RootStateOrAny) =>
    swapsTokensObjectSelector(state),
  );

  const { prices = [], isLoading } = useTokenHistoricalPrices({
    address: asset.address || zeroAddress(),
    chainId: chainId as string,
    timePeriod,
    vsCurrency: 'usd',
  });

  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useDispatch();

  useEffect(() => {
    const { SwapsController } = Engine.context as { SwapsController: any };
    const fetchTokenWithCache = async () => {
      try {
        await SwapsController.fetchTokenWithCache();
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
    dispatch(toggleReceiveModal(asset));
  };
  const onBuy = () => {
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
    InteractionManager.runAfterInteractions(() => {
      trackLegacyEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy',
        location: 'Token Screen',
        chain_id_destination: chainId,
      });
    });
  };

  const onSend = async () => {
    if (asset.isETH) {
      dispatch(newAssetTransaction(getEther(ticker)));
    } else {
      dispatch(newAssetTransaction(asset));
    }
    navigation.navigate('SendFlowView');
  };

  const goToSwaps = () => {
    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: asset.isETH
          ? swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS
          : asset.address,
      },
    });
  };

  // const goToBrowserUrl = (url: string) => {
  //   navigation.navigate(
  //     ...createWebviewNavDetails({
  //       url,
  //     }),
  //   );
  // };

  // const renderWarning = () => (
  //   <TouchableOpacity
  //     onPress={() => goToBrowserUrl(AppConstants.URLS.TOKEN_BALANCE)}
  //   >
  //     <Text style={styles.warning}>
  //       {strings('asset_overview.were_unable')} {asset.symbol}{' '}
  //       {strings('asset_overview.balance')}{' '}
  //       <Text style={styles.warningLinks}>
  //         {strings('asset_overview.troubleshooting_missing')}
  //       </Text>{' '}
  //       {strings('asset_overview.for_help')}
  //     </Text>
  //   </TouchableOpacity>
  // );
  const handleSelectTimePeriod = (
    _timePeriod: '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y',
  ) => {
    setTimePeriod(_timePeriod);
  };

  let mainBalance, secondaryBalance;
  const itemAddress = safeToChecksumAddress(asset.address);
  let balance, balanceFiat, fiatUnitPrice;
  if (asset.isETH) {
    balance = renderFromWei(accounts[selectedAddress]?.balance);
    balanceFiat = weiToFiat(
      hexToBN(accounts[selectedAddress].balance),
      conversionRate,
      currentCurrency,
    );
    fiatUnitPrice = conversionRate;
  } else {
    const exchangeRate =
      itemAddress && itemAddress in tokenExchangeRates
        ? tokenExchangeRates[itemAddress]
        : undefined;
    balance =
      itemAddress && itemAddress in tokenBalances
        ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals)
        : 0;
    balanceFiat = balanceToFiat(
      balance,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );
    fiatUnitPrice = balanceToFiat(
      1,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );
  }
  console.log({
    balance,
    balanceFiat,
    fiatUnitPrice,
    conversionRate,
  });
  // choose balances depending on 'primaryCurrency'
  if (primaryCurrency === 'ETH') {
    mainBalance = `${balance} ${asset.symbol}`;
    secondaryBalance = balanceFiat;
  } else {
    mainBalance = !balanceFiat ? `${balance} ${asset.symbol}` : balanceFiat;
    secondaryBalance = !balanceFiat
      ? balanceFiat
      : `${balance} ${asset.symbol}`;
  }

  const currentPrice = prices[prices.length - 1]?.[1] || 0;
  const comparePrice = prices[0]?.[1] || 0;

  const priceDiff = currentPrice - comparePrice;
  return (
    <View
      style={styles.wrapper}
      {...generateTestId(Platform, TOKEN_ASSET_OVERVIEW)}
    >
      <View>
        <Price
          asset={asset}
          priceDiff={priceDiff}
          currentCurrency={currentCurrency}
          currentPrice={currentPrice}
          comparePrice={comparePrice}
          isLoading={isLoading}
          timePeriod={timePeriod}
        />
        <PriceChart
          prices={prices}
          priceDiff={priceDiff}
          isLoading={isLoading}
        />
        <View style={styles.chartNavigationWrapper}>
          {['1d', '1w', '1m', '3m', '1y', '3y'].map((label) => (
            <ChartNavigationButton
              key={label}
              label={label}
              onPress={handleSelectTimePeriod.bind(this, label)}
              selected={timePeriod === label}
            />
          ))}
        </View>
        <View style={styles.balanceWrapper}>
          <Balance balance={mainBalance} fiatBalance={secondaryBalance} />
          <View style={styles.balanceButtons}>
            <AssetActionButton icon="receive" onPress={onReceive} />
            <AssetActionButton icon="send" onPress={onSend} />
          </View>
        </View>
        <View style={styles.aboutWrapper}>
          <AboutAsset asset={asset} chainId={chainId} />
        </View>
      </View>

      {/* {!asset.balanceError && (
        <View>
          {asset.isETH && allowedToBuy(chainId) && (
            <AssetActionButton
              icon="add"
              onPress={onBuy}
              label={strings('asset_overview.buy_button')}
            />
          )}

          {AppConstants.SWAPS.ACTIVE && (
            <AssetSwapButton
              isFeatureLive={swapsIsLive}
              isNetworkAllowed={isSwapsAllowed(chainId)}
              isAssetAllowed={
                asset.isETH || asset.address?.toLowerCase() in swapsTokens
              }
              onPress={goToSwaps}
            />
          )}
        </View>
      )} */}
    </View>
  );
};

export default AssetOverview;
