import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Hex,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetType,
  CaipChainId,
  isCaipAssetType,
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
  addCurrencySymbol,
  balanceToFiatNumber,
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
import Routes from '../../../constants/navigation/Routes';
import TokenDetails from './TokenDetails';
import { RootState } from '../../../reducers';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../util/analytics/actionButtonTracking';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { useRampNavigation } from '../Ramp/hooks/useRampNavigation';
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
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../constants/bridge';
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
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import parseRampIntent from '../Ramp/utils/parseRampIntent';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronEnergyBandwidthDetail from './TronEnergyBandwidthDetail/TronEnergyBandwidthDetail';
///: END:ONLY_INCLUDE_IF
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { getTokenExchangeRate } from '../Bridge/utils/exchange-rates';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { selectTronResourcesBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from './utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';

interface AssetOverviewProps {
  asset: TokenI;
  displayBuyButton?: boolean;
  displaySwapsButton?: boolean;
  networkName?: string;
}

const AssetOverview: React.FC<AssetOverviewProps> = ({
  asset,
  displayBuyButton,
  displaySwapsButton,
  networkName,
}: AssetOverviewProps) => {
  // For non evm assets, the resultChainId is equal to the asset.chainId; while for evm assets; the resultChainId === "eip155:1" !== asset.chainId
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const navigation = useNavigation();
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('1d');
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedInternalAccountAddress = selectedInternalAccount?.address;
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const getAccountByScope = useSelector(selectSelectedInternalAccountByScope);
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
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const chainId = asset.chainId as Hex;
  const ticker = nativeCurrency;
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, asset.chainId as Hex, asset.address as Hex),
  );

  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);

  const multichainAssetRates =
    multichainAssetsRates?.[asset.address as CaipAssetType];
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);

  const strxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-energy',
  );
  const strxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-bandwidth',
  );
  ///: END:ONLY_INCLUDE_IF

  const currentAddress = asset.address as Hex;
  const { goToBuy } = useRampNavigation();

  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    asset,
    address: currentAddress,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const { goToSwaps, networkModal } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenDetails,
    sourcePage: 'MainView',
    sourceToken: {
      ...asset,
      address: asset.address ?? NATIVE_SWAPS_TOKEN_ADDRESS,
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
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      button_label: strings('asset_overview.receive_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    const accountForChain =
      isNonEvmAsset && asset.chainId
        ? getAccountByScope(asset.chainId as CaipChainId)
        : selectedInternalAccount;

    const addressForChain = accountForChain?.address;

    // Show QR code for receiving this specific asset
    if (addressForChain && selectedAccountGroup && chainId) {
      navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: addressForChain,
          networkName: networkName || 'Unknown Network',
          chainId,
          groupId: selectedAccountGroup.id,
        },
      });
    } else {
      Logger.error(
        new Error(
          'AssetOverview::onReceive - Missing required data for navigation',
        ),
        {
          hasAddress: !!addressForChain,
          hasAccountGroup: !!selectedAccountGroup,
          hasChainId: !!chainId,
          isNonEvmAsset,
          assetChainId: asset.chainId,
        },
      );
    }
  };

  const onSend = async () => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.SEND,
      action_position: ActionPosition.THIRD_POSITION,
      button_label: strings('asset_overview.send_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    // Try non-EVM first, if handled, return early
    const wasHandledAsNonEvm = await sendNonEvmAsset(
      InitSendLocation.AssetOverview,
    );
    if (wasHandledAsNonEvm) {
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
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

    navigateToSendPage({ location: InitSendLocation.AssetOverview, asset });
  };

  const onBuy = () => {
    let assetId: string | undefined;

    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BUY,
      action_position: ActionPosition.FIRST_POSITION,
      button_label: strings('asset_overview.buy_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    try {
      if (isCaipAssetType(asset.address)) {
        assetId = asset.address;
      } else {
        assetId = parseRampIntent({
          chainId: getDecimalChainId(chainId),
          address: asset.address,
        })?.assetId;
      }
    } catch {
      assetId = undefined;
    }

    goToBuy({ assetId });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.BUY_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'TokenDetails',
          chain_id_destination: getDecimalChainId(chainId),
          region: rampGeodetectedRegion,
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
  const marketDataRate =
    allTokenMarketData?.[currentChainId]?.[itemAddress as Hex]?.price;

  // Fetch exchange rate - will use allTokenMarketData if available,
  // otherwise fetch from API for non-imported tokens
  // For non-EVM, skip if multichainAssetRates already has the rate
  const shouldFetchRate = isNonEvmAsset ? !multichainAssetRates : true;
  const [fetchedRate, setFetchedRate] = useState<number | undefined>();

  useEffect(() => {
    if (marketDataRate !== undefined || !itemAddress) {
      return;
    }

    const isNonEvm = isNonEvmChainId(currentChainId);
    const nativeAssetConversionRate =
      nativeCurrency &&
      conversionRateByTicker?.[nativeCurrency]?.conversionRate;

    // Skip EVM chains that don't have a native asset conversion rate
    if (!isNonEvm && !nativeAssetConversionRate) {
      return;
    }

    const fetchRate = async () => {
      try {
        const tokenFiatPrice = await getTokenExchangeRate({
          chainId: currentChainId,
          tokenAddress: itemAddress,
          currency: currentCurrency,
        });

        if (!tokenFiatPrice) {
          setFetchedRate(undefined);
          return;
        }

        // Non-EVM: use the fiat price directly
        if (isNonEvm) {
          setFetchedRate(tokenFiatPrice);
        } else if (nativeAssetConversionRate) {
          // EVM: convert to native currency rate
          setFetchedRate(tokenFiatPrice / nativeAssetConversionRate);
        }
      } catch (error) {
        console.error('Failed to fetch token exchange rate:', error);
        setFetchedRate(undefined);
      }
    };

    fetchRate();
  }, [
    shouldFetchRate,
    currentChainId,
    itemAddress,
    currentCurrency,
    marketDataRate,
    nativeCurrency,
    conversionRateByTicker,
  ]);

  const exchangeRate = marketDataRate ?? fetchedRate;

  let balance;
  const minimumDisplayThreshold = 0.00001;

  const isMultichainAsset = isNonEvmAsset;
  const isEthOrNative = asset.isETH || asset.isNative;

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const isTronNative =
    asset.ticker === 'TRX' && String(asset.chainId).startsWith('tron:');

  // create Staked TRX derived asset (same as native TRX but with a new name and balance)
  const stakedTrxAsset = isTronNative
    ? createStakedTrxAsset(asset, strxEnergy?.balance, strxBandwidth?.balance)
    : undefined;
  ///: END:ONLY_INCLUDE_IF

  if (isMultichainAccountsState2Enabled && asset.balance != null) {
    // When state2 is enabled and asset has balance, use it directly
    balance = asset.balance;
  } else if (isMultichainAsset) {
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
      balance = asset.balance ?? undefined;
    } else {
      balance =
        itemAddress && tokenBalanceHex
          ? renderFromTokenMinimalUnit(tokenBalanceHex, asset.decimals)
          : (asset.balance ?? undefined);
    }
  }

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

  // Calculate fiat balance if not provided in asset (e.g., when coming from trending view)
  let mainBalance = asset.balanceFiat || '';
  if (!mainBalance && balance != null) {
    // Convert balance to number for calculations
    const balanceNumber =
      typeof balance === 'number' ? balance : parseFloat(String(balance));

    if (balanceNumber > 0 && !isNaN(balanceNumber)) {
      if (isNonEvmAsset && multichainAssetRates?.rate) {
        // For non-EVM assets, use multichainAssetRates directly
        const rate = Number(multichainAssetRates.rate);
        const balanceFiatNumber = balanceNumber * rate;
        mainBalance =
          balanceFiatNumber >= 0.01 || balanceFiatNumber === 0
            ? addCurrencySymbol(balanceFiatNumber, currentCurrency)
            : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
      } else if (!isNonEvmAsset) {
        // For EVM assets, calculate fiat balance directly using balance, market price, and conversion rate
        const tickerConversionRate =
          conversionRateByTicker?.[nativeCurrency]?.conversionRate;

        if (
          tickerConversionRate &&
          marketDataRate !== undefined &&
          isFinite(marketDataRate)
        ) {
          const balanceFiatNumber = balanceToFiatNumber(
            balanceNumber,
            tickerConversionRate,
            marketDataRate,
          );
          if (isFinite(balanceFiatNumber)) {
            mainBalance =
              balanceFiatNumber >= 0.01 || balanceFiatNumber === 0
                ? addCurrencySymbol(balanceFiatNumber, currentCurrency)
                : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
          }
        }
      }
    }
  }

  const secondaryBalance =
    balance != null
      ? `${balance} ${asset.isETH ? asset.ticker : asset.symbol}`
      : undefined;

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
            goToSwaps={goToSwaps}
            onBuy={onBuy}
            onReceive={onReceive}
            onSend={onSend}
            asset={{
              address: asset.address,
              chainId,
            }}
          />
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && <TronEnergyBandwidthDetail />
            ///: END:ONLY_INCLUDE_IF
          }
          {balance != null && (
            <Balance
              asset={asset}
              mainBalance={mainBalance}
              secondaryBalance={secondaryBalance}
            />
          )}

          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && stakedTrxAsset && (
              <Balance
                asset={stakedTrxAsset}
                mainBalance={stakedTrxAsset.balance}
                secondaryBalance={`${stakedTrxAsset.balance} ${stakedTrxAsset.symbol}`}
                hideTitleHeading
                hidePercentageChange
              />
            )
            ///: END:ONLY_INCLUDE_IF
          }
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
