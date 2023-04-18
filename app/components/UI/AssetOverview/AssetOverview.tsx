import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { zeroAddress } from 'ethereumjs-util';
import React, { useContext, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { TOKEN_ASSET_OVERVIEW } from '../../../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { toggleReceiveModal } from '../../../actions/modals';
import { newAssetTransaction } from '../../../actions/transaction';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import { fontStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { safeToChecksumAddress } from '../../../util/address';
import {
  balanceToFiat,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiat,
} from '../../../util/number';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { getEther } from '../../../util/transactions';
import Text from '../../Base/Text';
import { createWebviewNavDetails } from '../../Views/SimpleWebview';
import useTokenHistoricalPrices from '../../hooks/useTokenHistoricalPrices';
import { Asset } from './AssetOverview.types';
import Balance from './Balance';
import ChartNavigationButton from './ChartNavigationButton';
import Price from './Price';
import { SEND_BUTTON_ID } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      paddingTop: 20,
    },
    warningWrapper: {
      paddingHorizontal: 16,
      marginBottom: 20,
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
      fontSize: 14,
    },
    chartNavigationWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 10,
      paddingVertical: 20,
    },
    balanceWrapper: {
      paddingHorizontal: 16,
    },
    balanceButtons: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 20,
    },
    receiveButton: {
      flexShrink: 1,
      marginRight: 8,
      width: '50%',
    },
    sendButton: {
      flexShrink: 1,
      marginLeft: 8,
      width: '50%',
    },
    aboutWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    },
  });

type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y';

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
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('1d');
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

  const { prices = [], isLoading } = useTokenHistoricalPrices({
    address: asset.address || zeroAddress(),
    chainId: chainId as string,
    timePeriod,
    vsCurrency: currentCurrency,
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

  const onSend = async () => {
    if (asset.isETH && ticker) {
      dispatch(newAssetTransaction(getEther(ticker)));
    } else {
      dispatch(newAssetTransaction(asset));
    }
    navigation.navigate('SendFlowView');
  };

  const goToBrowserUrl = (url: string) => {
    navigation.navigate(
      ...createWebviewNavDetails({
        url,
      }),
    );
  };

  const renderWarning = () => (
    <View style={styles.warningWrapper}>
      <TouchableOpacity
        onPress={() => goToBrowserUrl(AppConstants.URLS.TOKEN_BALANCE)}
      >
        <Text style={styles.warning}>
          {strings('asset_overview.were_unable')} {(asset as Asset).symbol}{' '}
          {strings('asset_overview.balance')}{' '}
          <Text style={styles.warningLinks}>
            {strings('asset_overview.troubleshooting_missing')}
          </Text>{' '}
          {strings('asset_overview.for_help')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleSelectTimePeriod = (_timePeriod: TimePeriod) => {
    setTimePeriod(_timePeriod);
  };

  const itemAddress = safeToChecksumAddress(asset.address);
  const exchangeRate =
    itemAddress && itemAddress in tokenExchangeRates
      ? tokenExchangeRates[itemAddress]
      : undefined;

  let balance, balanceFiat;
  if (asset.isETH) {
    balance = renderFromWei(accounts[selectedAddress]?.balance);
    balanceFiat = weiToFiat(
      hexToBN(accounts[selectedAddress].balance),
      conversionRate,
      currentCurrency,
    );
  } else {
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
  }

  let mainBalance, secondaryBalance;
  if (primaryCurrency === 'ETH') {
    mainBalance = `${balance} ${asset.symbol}`;
    secondaryBalance = balanceFiat;
  } else {
    mainBalance = !balanceFiat ? `${balance} ${asset.symbol}` : balanceFiat;
    secondaryBalance = !balanceFiat
      ? balanceFiat
      : `${balance} ${asset.symbol}`;
  }
  const currentPrice = asset.isETH
    ? conversionRate
    : exchangeRate * conversionRate;
  const comparePrice = prices[0]?.[1] || 0;
  const priceDiff = currentPrice - comparePrice;

  return (
    <View
      style={styles.wrapper}
      {...generateTestId(Platform, TOKEN_ASSET_OVERVIEW)}
    >
      {asset.balanceError ? (
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
            {(['1d', '1w', '1m', '3m', '1y', '3y'] as TimePeriod[]).map(
              (label) => (
                <ChartNavigationButton
                  key={label}
                  label={strings(
                    `asset_overview.chart_time_period_navigation.${label}`,
                  )}
                  onPress={handleSelectTimePeriod.bind(this, label)}
                  selected={timePeriod === label}
                />
              ),
            )}
          </View>
          <View style={styles.balanceWrapper}>
            <Balance balance={mainBalance} fiatBalance={secondaryBalance} />
            <View style={styles.balanceButtons}>
              <Button
                style={styles.receiveButton}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('asset_overview.receive_button')}
                onPress={onReceive}
              />
              <Button
                testID={SEND_BUTTON_ID}
                style={styles.sendButton}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('asset_overview.send_button')}
                onPress={onSend}
              />
            </View>
          </View>
          {/*  Commented out since we are going to re enable it after curating content */}
          {/* <View style={styles.aboutWrapper}>
            <AboutAsset asset={asset} chainId={chainId} />
          </View> */}
        </View>
      )}
    </View>
  );
};

export default AssetOverview;
