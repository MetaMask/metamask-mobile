import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Hex,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetType,
  CaipChainId,
  isCaipAssetType,
  isCaipChainId,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from './TokenOverview.testIds';
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
import { useScrollToMerklRewards } from './hooks/useScrollToMerklRewards';
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
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
  isAssetFromTrending,
} from '../Bridge/hooks/useSwapBridgeNavigation';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../constants/bridge';
import {
  getNativeSourceToken,
  getDefaultDestToken,
} from '../Bridge/utils/tokenUtils';
import { TraceName, endTrace } from '../../../util/trace';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../selectors/multichain';
import { isEvmAccountType, KeyringAccountType } from '@metamask/keyring-api';
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import { calculateAssetPrice } from './utils/calculateAssetPrice';
import {
  formatChainIdToCaip,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { InitSendLocation } from '../../Views/confirmations/constants/send';
import { useSendNavigation } from '../../Views/confirmations/hooks/useSendNavigation';
import parseRampIntent from '../Ramp/utils/parseRampIntent';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronEnergyBandwidthDetail from './TronEnergyBandwidthDetail/TronEnergyBandwidthDetail';
///: END:ONLY_INCLUDE_IF
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
// Perps Discovery Banner imports
import { selectPerpsEnabledFlag } from '../Perps';
import { usePerpsMarketForAsset } from '../Perps/hooks/usePerpsMarketForAsset';
import PerpsDiscoveryBanner from '../Perps/components/PerpsDiscoveryBanner';
import { PerpsEventValues } from '../Perps/constants/eventNames';
import { isTokenTrustworthyForPerps } from '../Perps/constants/perpsConfig';
import DSText, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { getTokenExchangeRate } from '../Bridge/utils/exchange-rates';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import MerklRewards from '../Earn/components/MerklRewards';
import { selectMerklCampaignClaimingEnabledFlag } from '../Earn/selectors/featureFlags';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import {
  selectTronResourcesBySelectedAccountGroup,
  selectAsset,
} from '../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from './utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';
import useRampsUnifiedV1Enabled from '../Ramp/hooks/useRampsUnifiedV1Enabled';
import { BridgeToken } from '../Bridge/types';
import { useRampTokens } from '../Ramp/hooks/useRampTokens';
import { toAssetId } from '../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../Ramp/Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../util/general';

/**
 * Determines the source and destination tokens for swap/bridge navigation.
 *
 * When coming from the trending tokens list, the user likely wants to BUY the token,
 * so we configure the swap with the asset as destination:
 * - For native tokens (ETH, BNB, etc.): use default pair token as source
 * - For other tokens: use native token as source
 *
 * Otherwise, we assume they want to SELL, so the asset is the source.
 *
 * @param asset - The token asset being viewed
 * @returns Object containing sourceToken and destToken for swap navigation
 */
export const getSwapTokens = (
  asset: TokenI,
): {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
} => {
  const wantsToBuyToken = isAssetFromTrending(asset);
  const isNative = isNativeAddress(asset.address);

  // Build bridge token from asset
  const bridgeToken: BridgeToken = {
    ...asset,
    address: asset.address ?? NATIVE_SWAPS_TOKEN_ADDRESS,
    chainId: asset.chainId as Hex | CaipChainId,
    decimals: asset.decimals,
    symbol: asset.symbol,
    name: asset.name,
    image: asset.image,
  };

  // Trending page: user wants to BUY the token (token as destination)
  if (wantsToBuyToken) {
    // For native tokens, use default pair token as source (e.g., mUSD for ETH)
    if (isNative) {
      return {
        sourceToken: getDefaultDestToken(bridgeToken.chainId),
        destToken: bridgeToken,
      };
    }
    // For non-native tokens, use native token as source
    return {
      sourceToken: getNativeSourceToken(bridgeToken.chainId),
      destToken: bridgeToken,
    };
  }

  // Home page: user wants to SELL the token (token as source)
  return {
    sourceToken: bridgeToken,
    destToken: undefined,
  };
};

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
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );
  const { navigateToSendPage } = useSendNavigation();
  const merklRewardsRef = useRef<View>(null);
  const merklRewardsYInHeaderRef = useRef<number | null>(null);

  // Scroll to MerklRewards section when navigating from "Claim bonus" CTA
  useScrollToMerklRewards(merklRewardsYInHeaderRef);

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

  // Use selector to get live Tron asset balance (not static navigation params)
  const isTronChain = String(asset.chainId).startsWith('tron:');
  const liveAsset = useSelector((state: RootState) =>
    isTronChain && asset.address && asset.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );
  ///: END:ONLY_INCLUDE_IF

  const currentAddress = asset.address as Hex;
  const { goToBuy } = useRampNavigation();
  const rampsButtonClickData = useRampsButtonClickData();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    asset,
    address: currentAddress,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const { sourceToken, destToken } = getSwapTokens(asset);

  const { goToSwaps, networkModal } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: 'MainView',
    sourceToken,
    destToken,
  });

  // Hook for handling non-EVM asset sending
  const { sendNonEvmAsset } = useSendNonEvmAsset({ asset });

  // Perps Discovery Banner hooks
  const { hasPerpsMarket, marketData } = usePerpsMarketForAsset(
    isPerpsEnabled ? asset.symbol : null,
  );

  // Check if token is trustworthy for showing Perps banner
  const isTokenTrustworthy = isTokenTrustworthyForPerps(asset);

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

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'TokenDetails',
          chain_id_destination: getDecimalChainId(chainId),
          ramp_type: rampUnifiedV1Enabled ? 'UNIFIED_BUY' : 'BUY',
          region: rampGeodetectedRegion,
          ramp_routing: rampsButtonClickData.ramp_routing,
          is_authenticated: rampsButtonClickData.is_authenticated,
          preferred_provider: rampsButtonClickData.preferred_provider,
          order_count: rampsButtonClickData.order_count,
        })
        .build(),
    );

    goToBuy({ assetId });
  };

  const goToBrowserUrl = (url: string) => {
    const [screen, params] = createWebviewNavDetails({
      url,
    });

    // TODO: params should not have to be cast here
    navigation.navigate(screen, params as Record<string, unknown>);
  };

  // Perps Discovery Banner press handler
  // Analytics (PERPS_SCREEN_VIEWED) tracked by PerpsMarketDetailsView on mount
  const handlePerpsDiscoveryPress = useCallback(() => {
    if (marketData) {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: marketData,
          source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
        },
      });
    }
  }, [marketData, navigation]);

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
  const isEthOrNative = asset.isETH || asset.isNative;

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const isTronNative =
    asset.ticker === 'TRX' && String(asset.chainId).startsWith('tron:');

  // create Staked TRX derived asset (same as native TRX but with a new name and balance)
  const stakedTrxAsset = isTronNative
    ? createStakedTrxAsset(asset, strxEnergy?.balance, strxBandwidth?.balance)
    : undefined;
  ///: END:ONLY_INCLUDE_IF

  // Determine the balance source - prefer live data for Tron, otherwise use asset prop
  let balanceSource = asset.balance;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (isTronChain && liveAsset?.balance != null) {
    balanceSource = liveAsset.balance;
  }
  ///: END:ONLY_INCLUDE_IF

  if (balanceSource != null) {
    balance = balanceSource;
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
  let balanceFiatSource = asset.balanceFiat;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (isTronChain && liveAsset?.balanceFiat != null) {
    balanceFiatSource = liveAsset.balanceFiat;
  }
  ///: END:ONLY_INCLUDE_IF
  let mainBalance = balanceFiatSource || '';
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

  const { allTokens } = useRampTokens();

  const isAssetBuyable = useMemo(() => {
    if (!allTokens) return false;

    const chainIdInCaip = isCaipChainId(asset.chainId)
      ? asset.chainId
      : toEvmCaipChainId(asset.chainId as Hex);
    const assetId = toAssetId(asset.address, chainIdInCaip);

    const matchingToken = allTokens.find((token) => {
      if (!token.assetId) return false;

      const parsedTokenAssetId = parseCAIP19AssetId(token.assetId);
      if (!parsedTokenAssetId) return false;

      // For native assets, match by chainId and slip44 namespace
      if (asset.isNative) {
        return (
          token.chainId === chainIdInCaip &&
          parsedTokenAssetId.assetNamespace === 'slip44'
        );
      }

      // For ERC20 tokens, match by assetId
      return assetId && toLowerCaseEquals(token.assetId, assetId);
    });
    return matchingToken?.tokenSupported ?? false;
  }, [allTokens, asset.isNative, asset.chainId, asset.address]);

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
            displayBuyButton={displayBuyButton && isAssetBuyable}
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
          {isMerklCampaignClaimingEnabled && (
            <View
              ref={merklRewardsRef}
              testID="merkl-rewards-section"
              onLayout={(event) => {
                // Store Y position relative to header (which is the scroll offset)
                // This is more reliable than measureInWindow for FlatList scrolling
                const { y } = event.nativeEvent.layout;
                merklRewardsYInHeaderRef.current = y;
              }}
            >
              <MerklRewards asset={asset} />
            </View>
          )}
          {isPerpsEnabled &&
            hasPerpsMarket &&
            marketData &&
            isTokenTrustworthy && (
              <>
                <View style={styles.perpsPositionHeader}>
                  <DSText variant={TextVariant.HeadingMD}>
                    {strings('asset_overview.perps_position')}
                  </DSText>
                </View>
                <PerpsDiscoveryBanner
                  symbol={marketData.symbol}
                  maxLeverage={marketData.maxLeverage}
                  onPress={handlePerpsDiscoveryPress}
                  testID="perps-discovery-banner"
                />
              </>
            )}
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
