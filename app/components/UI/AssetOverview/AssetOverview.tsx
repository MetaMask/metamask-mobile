import React, { useCallback, useEffect, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Hex,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetType,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/utils';
import I18n, { strings } from '../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { newAssetTransaction } from '../../../actions/transaction';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import {
  selectEvmChainId,
  selectNativeCurrencyByChainId,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../selectors/accountsController';
import Logger from '../../../util/Logger';
import { safeToChecksumAddress } from '../../../util/address';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
  toHexadecimal,
} from '../../../util/number';
import { getEther } from '../../../util/transactions';
import Text from '../../Base/Text';
import useTokenHistoricalPrices, {
  TimePeriod,
} from '../../hooks/useTokenHistoricalPrices';
import Balance from './Balance';
import ChartNavigationButton from './ChartNavigationButton';
import Price from './Price';
import styleSheet from './AssetOverview.styles';
import { useStyles } from '../../../component-library/hooks';
import { QRTabSwitcherScreens } from '../../../components/Views/QRTabSwitcher';
import TokenDetails from './TokenDetails';
import { RootState } from '../../../reducers';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { createBuyNavigationDetails } from '../Ramp/Aggregator/routes/utils';
import { TokenI } from '../Tokens/types';
import AssetDetailsActions from '../../../components/Views/AssetDetails/AssetDetailsActions';
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../selectors/tokenSearchDiscoveryDataController';
import { formatWithThreshold } from '../../../util/assets';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../Bridge/hooks/useSwapBridgeNavigation';
import { swapsUtils } from '@metamask/swaps-controller';
import { TraceName, endTrace } from '../../../util/trace';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../selectors/multichain';
import { isEvmAccountType, KeyringAccountType } from '@metamask/keyring-api';
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import { calculateAssetPrice } from './utils/calculateAssetPrice';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { InitSendLocation } from '../../Views/confirmations/constants/send';
import { useSendNavigation } from '../../Views/confirmations/hooks/useSendNavigation';

interface AssetOverviewProps {
  asset: TokenI;
  displayFundButton?: boolean;
  displaySwapsButton?: boolean;
  displayBridgeButton?: boolean;
  swapsIsLive?: boolean;
  networkName?: string;
}

const AssetOverview: React.FC<AssetOverviewProps> = ({
  asset,
  displayFundButton,
  displaySwapsButton,
  displayBridgeButton,
  swapsIsLive,
  networkName,
}: AssetOverviewProps) => {
  // For non evm assets, the resultChainId is equal to the asset.chainId; while for evm assets; the resultChainId === "eip155:1" !== asset.chainId
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const navigation = useNavigation();
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('1d');
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedInternalAccountAddress = selectedInternalAccount?.address;
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { trackEvent, createEventBuilder } = useMetrics();
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const selectedChainId = useSelector(selectEvmChainId);
  const { navigateToSendPage } = useSendNavigation();

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );

  const multiChainTokenBalance = useSelector(selectTokensBalances);

  const chainId = asset.chainId as Hex;
  const ticker = nativeCurrency;
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, asset.chainId as Hex, asset.address as Hex),
  );
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);

  const multichainAssetRates =
    multichainAssetsRates?.[asset.address as CaipAssetType];
  ///: END:ONLY_INCLUDE_IF

  const currentAddress = asset.address as Hex;

  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    asset,
    address: currentAddress,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const { goToBridge, goToSwaps, networkModal } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenDetails,
    sourcePage: 'MainView',
    sourceToken: {
      ...asset,
      address: asset.address ?? swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
      chainId: asset.chainId as Hex,
      decimals: asset.decimals,
      symbol: asset.symbol,
      name: asset.name,
      image: asset.image,
    },
  });

  // Hook for handling non-EVM asset sending
  const { sendNonEvmAsset } = useSendNonEvmAsset({ asset });

  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  useEffect(() => {
    endTrace({ name: TraceName.AssetDetails });
  }, []);

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
    navigation.navigate('QRTabSwitcher', {
      initialScreen: QRTabSwitcherScreens.Receive,
      disableTabber: true,
      networkName,
    });
  };

  const onSend = async () => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    // Try non-EVM first, if handled, return early
    const wasHandledAsNonEvm = await sendNonEvmAsset(
      InitSendLocation.AssetOverview,
    );
    if (wasHandledAsNonEvm) {
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    navigation.navigate('WalletTabHome', {
      screen: 'WalletTabStackFlow',
      params: {
        screen: 'WalletView',
      },
    });

    // For EVM networks, switch the network if needed
    if (asset.chainId !== selectedChainId) {
      const { NetworkController, MultichainNetworkController } = Engine.context;
      const networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(
          asset.chainId as Hex,
        );

      const networkClientId =
        networkConfiguration?.rpcEndpoints?.[
          networkConfiguration.defaultRpcEndpointIndex
        ]?.networkClientId;

      await MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      );
    }

    if ((asset.isETH || asset.isNative) && ticker) {
      dispatch(newAssetTransaction(getEther(ticker)));
    } else {
      dispatch(newAssetTransaction(asset));
    }
    navigateToSendPage(InitSendLocation.AssetOverview, asset);
  };

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
    // TODO: params should not have to be cast here
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
      },
    });
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

  const chartNavigationButtons: TimePeriod[] = useMemo(
    () =>
      !isNonEvmAsset
        ? ['1d', '1w', '1m', '3m', '1y', '3y']
        : ['1d', '1w', '1m', '3m', '1y', 'all'],
    [isNonEvmAsset],
  );

  const handleSelectTimePeriod = useCallback((_timePeriod: TimePeriod) => {
    setTimePeriod(_timePeriod);
  }, []);

  const renderChartNavigationButton = useCallback(
    () =>
      chartNavigationButtons.map((label) => (
        <ChartNavigationButton
          key={label}
          label={strings(
            `asset_overview.chart_time_period_navigation.${label}`,
          )}
          onPress={() => handleSelectTimePeriod(label)}
          selected={timePeriod === label}
        />
      )),
    [handleSelectTimePeriod, timePeriod, chartNavigationButtons],
  );

  const itemAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  const currentChainId = chainId as Hex;
  const exchangeRate =
    allTokenMarketData?.[currentChainId]?.[itemAddress as Hex]?.price;

  let balance;
  const minimumDisplayThreshold = 0.00001;

  const isMultichainAsset = isNonEvmAsset;
  const isEthOrNative = asset.isETH || asset.isNative;

  if (isMultichainAsset) {
    balance = asset.balance
      ? formatWithThreshold(
          parseFloat(asset.balance),
          minimumDisplayThreshold,
          I18n.locale,
          { minimumFractionDigits: 0, maximumFractionDigits: 5 },
        )
      : 0;
  } else if (isEthOrNative) {
    balance = renderFromWei(
      // @ts-expect-error - This should be fixed at the accountsController selector level, ongoing discussion
      accountsByChainId[toHexadecimal(chainId)]?.[selectedAddress]?.balance,
    );
  } else {
    const multiChainTokenBalanceHex =
      itemAddress &&
      multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
        chainId as Hex
      ]?.[itemAddress as Hex];
    const tokenBalanceHex = multiChainTokenBalanceHex;
    if (
      !isEvmAccountType(selectedInternalAccount?.type as KeyringAccountType)
    ) {
      balance = asset.balance || 0;
    } else {
      balance =
        itemAddress && tokenBalanceHex
          ? renderFromTokenMinimalUnit(tokenBalanceHex, asset.decimals)
          : 0;
    }
  }

  const mainBalance = asset.balanceFiat || '';
  const secondaryBalance = `${balance} ${
    asset.isETH ? asset.ticker : asset.symbol
  }`;

  const convertedMultichainAssetRates =
    isNonEvmAsset && multichainAssetRates
      ? {
          rate: Number(multichainAssetRates.rate),
          marketData: undefined,
        }
      : undefined;

  let currentPrice = 0;
  let priceDiff = 0;
  let comparePrice = 0;

  if (isAssetFromSearch(asset) && tokenResult?.found) {
    currentPrice = tokenResult.price?.price || 0;
  } else {
    const {
      currentPrice: calculatedPrice,
      priceDiff: calculatedPriceDiff,
      comparePrice: calculatedComparePrice,
    } = calculateAssetPrice({
      _asset: asset,
      isEvmAssetSelected: !isNonEvmAsset,
      exchangeRate,
      tickerConversionRate:
        conversionRateByTicker?.[nativeCurrency]?.conversionRate ?? undefined,
      prices,
      multichainAssetRates: convertedMultichainAssetRates,
      timePeriod,
    });
    currentPrice = calculatedPrice;
    priceDiff = calculatedPriceDiff;
    comparePrice = calculatedComparePrice;
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
            ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
            multichainAssetsRates={multichainAssetsRates}
            ///: END:ONLY_INCLUDE_IF
            isEvmAssetSelected={!isNonEvmAsset}
          />
          <View style={styles.chartNavigationWrapper}>
            {renderChartNavigationButton()}
          </View>
          <AssetDetailsActions
            displayFundButton={displayFundButton}
            displaySwapsButton={displaySwapsButton}
            displayBridgeButton={displayBridgeButton}
            swapsIsLive={swapsIsLive}
            goToBridge={goToBridge}
            goToSwaps={goToSwaps}
            onBuy={onBuy}
            onReceive={onReceive}
            onSend={onSend}
            asset={{
              address: asset.address,
              chainId,
            }}
          />
          <Balance
            asset={asset}
            mainBalance={mainBalance}
            secondaryBalance={secondaryBalance}
          />
          <View style={styles.tokenDetailsWrapper}>
            <TokenDetails asset={asset} />
          </View>
          {networkModal}
        </View>
      )}
    </View>
  );
};

export default AssetOverview;
