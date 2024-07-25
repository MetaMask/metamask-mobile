import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { zeroAddress } from 'ethereumjs-util';
import React, { useCallback, useEffect } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../reducers';
import { strings } from '../../../../locales/i18n';
import {
  TOKEN_ASSET_OVERVIEW,
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_OVERVIEW_RECEIVE_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { toggleReceiveModal } from '../../../actions/modals';
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
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
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
  TokenPrice,
} from '../../hooks/useTokenHistoricalPrices';
import { Asset } from './AssetOverview.types';
import Balance from './Balance';
import ChartNavigationButton from './ChartNavigationButton';
import Price from './Price';
import styleSheet from './AssetOverview.styles';
import { useStyles } from '../../../component-library/hooks';

interface AssetOverviewProps {
  navigation: {
    navigate: (route: string, props?: Record<string, unknown>) => void;
  };
  asset: Asset;
}

const AssetOverview: React.FC<AssetOverviewProps> = ({
  navigation,
  asset,
}: AssetOverviewProps) => {
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('1d');
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  )!; // Non-null assertion
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const tokenBalances = useSelector(selectContractBalances);
  const chainId = useSelector((state: RootState) => selectChainId(state));
  const ticker = useSelector((state: RootState) => selectTicker(state));

  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    address: asset.isETH
      ? (zeroAddress() as `0x${string}`)
      : (typeof asset.address === 'string'
        ? (asset.address.startsWith('0x')
          ? (asset.address as `0x${string}`)
          : (`0x${asset.address}` as `0x${string}`))
        : '0x0000000000000000000000000000000000000000'),
    chainId: chainId as `0x${string}`,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  useEffect(() => {
    interface SwapsControllerType {
      fetchTokenWithCache: () => Promise<void>;
    }
    const { SwapsController } = Engine.context as { SwapsController: SwapsControllerType };
    const fetchTokenWithCache = async () => {
      try {
        await SwapsController.fetchTokenWithCache();
      } catch (error) {
        Logger.error(
          error as Error,
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
      ...(createWebviewNavDetails({
        url,
      }) as [string, Record<string, unknown>])
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
  const exchangeRate =
    itemAddress && itemAddress in tokenExchangeRates
      ? tokenExchangeRates?.[itemAddress]?.price
      : undefined;

  let balance: string, balanceFiat: string;
  if (asset.isETH) {
    const accountBalance = accountsByChainId[toHexadecimal(chainId)]?.[selectedAddress]?.balance ?? '0';
    balance = renderFromWei(accountBalance);
    balanceFiat = weiToFiat(
      hexToBN(accountBalance),
      conversionRate,
      currentCurrency,
    ) ?? '0';
  } else {
    balance =
      itemAddress && itemAddress in tokenBalances
        ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals)
        : '0';
    balanceFiat = balanceToFiat(
      balance,
      conversionRate,
      exchangeRate,
      currentCurrency,
    ) ?? '0';
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

  let currentPrice = 0;
  let priceDiff = 0;
  const latestPrice = prices[prices.length - 1];

  if (asset.isETH) {
    currentPrice = conversionRate || 0;
  } else if (exchangeRate && conversionRate) {
    currentPrice = exchangeRate * conversionRate;
  } else if (latestPrice && Array.isArray(latestPrice) && typeof latestPrice[1] === 'number') {
    currentPrice = latestPrice[1];
  }

  const comparePrice = prices[0] && Array.isArray(prices[0]) && typeof prices[0][1] === 'number' ? prices[0][1] : currentPrice;
  priceDiff = currentPrice - comparePrice;

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
            {renderChartNavigationButton()}
          </View>
          <View style={styles.balanceWrapper}>
            <Balance balance={mainBalance} fiatBalance={secondaryBalance} />
            <View style={styles.balanceButtons}>
              <Button
                style={{ ...styles.footerButton, ...styles.receiveButton }}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('asset_overview.receive_button')}
                onPress={onReceive}
                testID={TOKEN_OVERVIEW_RECEIVE_BUTTON}
              />
              <Button
                style={{ ...styles.footerButton, ...styles.sendButton }}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('asset_overview.send_button')}
                onPress={onSend}
                {...generateTestId(Platform, TOKEN_OVERVIEW_SEND_BUTTON)}
              />
            </View>
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
