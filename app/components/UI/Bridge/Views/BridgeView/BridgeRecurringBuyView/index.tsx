import React, { useCallback, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AdvancedOrderMetricsEventName,
  FeatureId,
  formatAddressToAssetId,
  formatChainIdToCaip,
  type MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  selectOrdersNetworkFilter,
  selectRecurringPriceRange,
  selectRecurringPriceTolerance,
  selectRecurringScheduleValidation,
} from '../../../../../../core/redux/slices/bridge';
import { selectIsDestAssetRequireActivate } from '../../../../../../selectors/bridge';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../../../Earn/constants/networks';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import OrdersTabs, { OrdersTabKey } from '../../../components/OrdersTabs';
import PriceRangeRow from '../../../components/PriceRangeRow';
import RecurringScheduleFields, {
  type RecurringScheduleFieldsRef,
} from '../../../components/RecurringScheduleFields';
import {
  HardwareWalletUnsupportedBanner,
  InsufficientNativeReserveBanner,
  MissingQuoteAndAssetsPriceDataBanner,
  QuoteErrorBanner,
  DestAssetRequireActivateBanner,
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import { SwapsRecurringBuyConfirmButton } from '../../../components/SwapsRecurringBuyConfirmButton';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeQuoteEvents } from '../../../hooks/useBridgeQuoteEvents';
import { useHasSufficientGas } from '../../../hooks/useHasSufficientGas';
import useIsInsufficientBalance from '../../../hooks/useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../../../hooks/useInsufficientNativeReserveError';
import { useIsNetworkFeeUnavailable } from '../../../hooks/useIsNetworkFeeUnavailable';
import { useRecurringOrders } from '../../../hooks/useRecurringOrders';
import { useRecurringOrdersListTrace } from '../../../hooks/useRecurringOrdersListTrace';
import { useSentinelFeeTokenValidation } from '../../../hooks/useSentinelFeeTokenValidation';
import { formatPriceRangeBounds } from '../../../utils/priceRange';
import { isPairSupportedForNonMarketSwapTab } from '../../../utils/tokenUtils';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import {
  type RecurringOrder,
  RecurringOrderState,
} from '../../../api/recurringOrders.types';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import { BridgeRecurringBuyFooterView } from './BridgeRecurringBuyFooterView';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import { createRecurringOrdersTab } from './RecurringOrderRow';
import { SentinelFeeTokenErrorBanner } from '../SentinelFeeTokenErrorBanner';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { getOrderTypeFromDraftPriceRange } from '../../../utils/recurringOrders';
import {
  getAdvancedOrderTokenProperties,
  getAdvancedOrderTradeProperties,
} from '../../../utils/advancedOrders';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../../selectors/bridge/featureFlags';
import {
  RECURRING_ORDERS_CONSTRAINED_REFETCH_INTERVAL,
  RECURRING_ORDERS_REFETCH_INTERVAL,
} from '../../../constants/recurringOrders';
import CostToleranceRow from '../../../components/LimitOrderDetails/CostToleranceRow';
import { BridgeTabKey } from '../BridgeView.constants';

const OPEN_ORDER_STATES = [RecurringOrderState.Open];
const HISTORY_ORDER_STATES = [
  RecurringOrderState.Completed,
  RecurringOrderState.Cancelled,
];
const LOAD_MORE_SCROLL_THRESHOLD = 200;
const FEE_TOKEN_ERROR_BANNER_TEST_IDS = {
  unsupportedPair:
    BridgeViewSelectorsIDs.RECURRING_FEE_TOKEN_UNSUPPORTED_BANNER,
  unavailable: BridgeViewSelectorsIDs.RECURRING_FEE_TOKENS_UNAVAILABLE_BANNER,
  retryButton: BridgeViewSelectorsIDs.RECURRING_FEE_TOKEN_RETRY_BUTTON,
};

const BridgeRecurringBuyViewContent = ({
  location,
}: {
  location: MetaMetricsSwapsEventSource;
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isScreenFocused = useIsFocused();
  const inputRef = useRef<TokenInputAreaRef>(null);
  const scheduleFieldsRef = useRef<RecurringScheduleFieldsRef>(null);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [hasVisibleBanner, setHasVisibleBanner] = useState(false);
  const {
    latestSourceBalance,
    renderedTab,
    recurringOrdersTab = OrdersTabKey.OpenOrders,
    setRecurringOrdersTab = () => undefined,
  } = useBridgeSession();
  const {
    destToken,
    destTokenAmount,
    enabledChainIds,
    handleDestTokenPress,
    handleFlipTokensPress,
    handleSourceMaxPress,
    handleSourcePresetAmountSelect,
    handleSourceTokenPress,
    isDestAmountLoading,
    isFlipDisabled,
    isQuoteSponsored,
    recurringOrderMinAmount: {
      formattedMinAmountInSelectedCurrency,
      hasError: hasMinAmountError,
      isBelowMinAmount,
    },
    sourceAmountInput,
    sourceToken,
    sourceAmount,
  } = useRecurringBuySwapInputs();

  // The pressed tab page renders the previous tab's pair until the tab
  // replaces it, and that pair must not be validated against this tab's fees.
  const isPairPendingReplacement =
    enabledChainIds !== undefined &&
    !isPairSupportedForNonMarketSwapTab(
      sourceToken,
      destToken,
      enabledChainIds,
    );
  const orderChainId =
    sourceToken && !isPairPendingReplacement
      ? formatChainIdToCaip(sourceToken.chainId)
      : undefined;
  const sourceAssetId = sourceToken
    ? (formatAddressToAssetId(sourceToken.address, sourceToken.chainId) ??
      undefined)
    : undefined;
  const destinationAssetId = destToken
    ? (formatAddressToAssetId(destToken.address, destToken.chainId) ??
      undefined)
    : undefined;
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const isRemoteDataEnabled = networkTier !== 'NONE';
  let ordersRefetchInterval: number | undefined =
    RECURRING_ORDERS_REFETCH_INTERVAL;
  if (networkTier === 'NONE' || !isScreenFocused) {
    ordersRefetchInterval = undefined;
  } else if (hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR') {
    ordersRefetchInterval = RECURRING_ORDERS_CONSTRAINED_REFETCH_INTERVAL;
  }
  const feeTokenValidation = useSentinelFeeTokenValidation({
    chainId: orderChainId,
    sourceAssetId,
    destinationAssetId,
    enabled: isRemoteDataEnabled,
  });

  const priceRange = useSelector(selectRecurringPriceRange);
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );
  const getSelectedAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const walletAddress = getSelectedAccountByScope(EVM_SCOPE)?.address;
  const ordersNetworkFilter = useSelector(selectOrdersNetworkFilter);
  const scheduleValidation = useSelector(selectRecurringScheduleValidation);
  const {
    activeQuote,
    blockaidError,
    isLoading,
    isNoQuotesAvailable,
    shouldShowPriceImpactWarning,
  } = useBridgeQuoteDataContext();
  const isNetworkFeeUnavailable = useIsNetworkFeeUnavailable(activeQuote);
  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });
  const hasInsufficientGas = !isNetworkFeeUnavailable && !hasSufficientGas;
  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });
  const hasInsufficientNativeReserveError = Boolean(
    useInsufficientNativeReserveError({
      amount: sourceAmount,
      token: sourceToken,
      latestAtomicBalance: latestSourceBalance?.atomicBalance,
      walletAddress,
      activeQuote,
    }),
  );
  const isDestAssetRequireActivate = useSelector(
    selectIsDestAssetRequireActivate,
  );
  const openOrdersQuery = useRecurringOrders({
    walletAddress,
    orderStates: OPEN_ORDER_STATES,
    chainId: ordersNetworkFilter,
    enabled:
      isRemoteDataEnabled && recurringOrdersTab === OrdersTabKey.OpenOrders,
    refetchInterval:
      recurringOrdersTab === OrdersTabKey.OpenOrders
        ? ordersRefetchInterval
        : undefined,
  });
  const historyQuery = useRecurringOrders({
    walletAddress,
    orderStates: HISTORY_ORDER_STATES,
    chainId: ordersNetworkFilter,
    enabled: isRemoteDataEnabled && recurringOrdersTab === OrdersTabKey.History,
    refetchInterval:
      recurringOrdersTab === OrdersTabKey.History
        ? ordersRefetchInterval
        : undefined,
  });
  const activeOrdersQuery =
    recurringOrdersTab === OrdersTabKey.OpenOrders
      ? openOrdersQuery
      : historyQuery;

  useRecurringOrdersListTrace({
    enabled: isRemoteDataEnabled && Boolean(walletAddress),
    listType:
      recurringOrdersTab === OrdersTabKey.OpenOrders ? 'open' : 'history',
    hasNetworkFilter: Boolean(ordersNetworkFilter),
    isLoading: activeOrdersQuery.isLoading,
    isError: activeOrdersQuery.isError,
    resultCount: activeOrdersQuery.orders.length,
  });

  const {
    close: closeKeypad,
    focusAmount,
    focusEvery,
    focusRepeat,
    handleChange: handleKeypadChange,
    isAmountFocused,
    keypadProps,
    keypadRef,
  } = useRecurringBuyKeypad({ sourceAmountInput });

  const blurInputs = useCallback(() => {
    inputRef.current?.blur();
    scheduleFieldsRef.current?.blur();
  }, []);

  const dismissInputAndKeypad = useCallback(() => {
    blurInputs();
    closeKeypad();
  }, [blurInputs, closeKeypad]);

  const handleBannersLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHasVisibleBanner = event.nativeEvent.layout.height > 0;
    setHasVisibleBanner((current) =>
      current === nextHasVisibleBanner ? current : nextHasVisibleBanner,
    );
  }, []);

  const { trackEvent, createEventBuilder } = useAnalytics();
  const canPreviewOrder =
    Boolean(activeQuote) &&
    scheduleValidation.isValid &&
    feeTokenValidation.isValid &&
    !hasMinAmountError &&
    !isBelowMinAmount;

  useBridgeQuoteEvents({
    enabled: renderedTab === BridgeTabKey.Recurring,
    eventName: AdvancedOrderMetricsEventName.QuotesReceived,
    hasInsufficientBalance,
    hasInsufficientNativeReserveError,
    hasNoQuotesAvailable: isNoQuotesAvailable,
    hasInsufficientGas,
    hasTxAlert: Boolean(blockaidError),
    isNetworkFeeUnavailable,
    isSubmitDisabled: !canPreviewOrder,
    isPriceImpactWarningVisible: shouldShowPriceImpactWarning,
    hasDestAssetRequireActivate: isDestAssetRequireActivate,
    hasUsableQuote: Boolean(activeQuote && !isPairPendingReplacement),
  });
  const previewOrderLabel =
    isBelowMinAmount && formattedMinAmountInSelectedCurrency !== undefined
      ? strings('bridge.recurring.min_order_amount', {
          amount: formattedMinAmountInSelectedCurrency,
        })
      : strings('bridge.recurring.preview_order');

  const handlePreviewOrder = useCallback(() => {
    if (!feeTokenValidation.isValid || hasMinAmountError || isBelowMinAmount) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ADVANCED_ORDER_SUBMITTED)
        .addProperties({
          ...getAdvancedOrderTokenProperties({ sourceToken, destToken }),
          ...getAdvancedOrderTradeProperties(activeQuote),
          location,
          feature_id: FeatureId.RECURRING_ORDER,
          order_type: getOrderTypeFromDraftPriceRange(priceRange),
        })
        .build(),
    );
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_CONFIRM_ORDER_MODAL,
      params: { location },
    });
  }, [
    activeQuote,
    destToken,
    dismissInputAndKeypad,
    navigation,
    priceRange,
    sourceToken,
    trackEvent,
    createEventBuilder,
    feeTokenValidation.isValid,
    hasMinAmountError,
    isBelowMinAmount,
    location,
  ]);

  const handleOrderPress = useCallback(
    (order: RecurringOrder) => {
      navigation.navigate(Routes.BRIDGE.RECURRING_ORDER_DETAILS, { order });
    },
    [navigation],
  );

  const openOrders = createRecurringOrdersTab({
    orders: openOrdersQuery.orders,
    onOrderPress: handleOrderPress,
    isLoading: openOrdersQuery.isLoading,
    isError: openOrdersQuery.isError,
    isFetchingNextPage: openOrdersQuery.isFetchingNextPage,
    onRetry: () => openOrdersQuery.refetch(),
  });
  const history = createRecurringOrdersTab({
    orders: historyQuery.orders,
    onOrderPress: handleOrderPress,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    isFetchingNextPage: historyQuery.isFetchingNextPage,
    onRetry: () => historyQuery.refetch(),
  });

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const distanceFromBottom =
        nativeEvent.contentSize.height -
        nativeEvent.layoutMeasurement.height -
        nativeEvent.contentOffset.y;

      if (distanceFromBottom > LOAD_MORE_SCROLL_THRESHOLD) {
        return;
      }

      if (recurringOrdersTab === OrdersTabKey.OpenOrders) {
        openOrdersQuery.fetchNextPage();
        return;
      }

      historyQuery.fetchNextPage();
    },
    [recurringOrdersTab, historyQuery, openOrdersQuery],
  );

  const handleOrdersRefresh = useCallback(async () => {
    setIsRefreshingOrders(true);
    try {
      await activeOrdersQuery.refresh();
    } finally {
      setIsRefreshingOrders(false);
    }
  }, [activeOrdersQuery]);

  const priceRangeToken =
    priceRange?.tokenSide === 'source' ? sourceToken : destToken;
  const { minLabel: priceRangeMinLabel, maxLabel: priceRangeMaxLabel } =
    formatPriceRangeBounds(
      priceRange?.min ?? '',
      priceRange?.max ?? '',
      priceRange?.currency ?? '',
    );

  const handlePriceRangePress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_PRICE_RANGE_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  const handlePriceTolerancePress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_DEFAULT_PRICE_TOLERANCE_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  const handleUnitPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_INTERVAL_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  const handleRepeatInfoPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_REPEAT_INFO_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        twClassName="flex-1 min-h-0"
        testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
      >
        <ScrollView
          testID={BridgeViewSelectorsIDs.RECURRING_BUY_SCROLL}
          style={tw.style('flex-1 min-h-0')}
          contentContainerStyle={tw.style('grow')}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={dismissInputAndKeypad}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingOrders}
              onRefresh={handleOrdersRefresh}
            />
          }
        >
          <Box
            twClassName="flex-1"
            testID={BridgeViewSelectorsIDs.RECURRING_BUY_DISMISS_AREA}
            onStartShouldSetResponder={() => true}
            onResponderRelease={dismissInputAndKeypad}
          >
            <SwapsInputs
              inputRef={inputRef}
              sourceToken={sourceToken}
              sourceAmountInput={sourceAmountInput}
              destToken={destToken}
              destTokenAmount={destTokenAmount}
              isDestAmountLoading={isDestAmountLoading}
              isFlipDisabled={isFlipDisabled}
              onSourceInputPress={focusAmount}
              onSourceTokenPress={handleSourceTokenPress}
              onSourceMaxPress={handleSourceMaxPress}
              onFlipPress={handleFlipTokensPress}
              onDestInputPress={closeKeypad}
              onDestTokenPress={handleDestTokenPress}
              sourceTokenAreaTestID={
                BridgeViewSelectorsIDs.RECURRING_SOURCE_TOKEN_AREA
              }
              destTokenAreaTestID={
                BridgeViewSelectorsIDs.RECURRING_DEST_TOKEN_AREA
              }
              sourceAmountTypeToggleTestID={
                BridgeViewSelectorsIDs.RECURRING_SOURCE_AMOUNT_TYPE_TOGGLE
              }
              hideDestAmount
              destAmountReplacementLabelTestID={
                BridgeViewSelectorsIDs.RECURRING_DEST_YOU_GET
              }
            />

            <Box twClassName="-mt-1">
              <RecurringScheduleFields
                ref={scheduleFieldsRef}
                onEveryPress={focusEvery}
                onRepeatPress={focusRepeat}
                onDismissKeypad={dismissInputAndKeypad}
                onUnitPress={handleUnitPress}
                onRepeatInfoPress={handleRepeatInfoPress}
              />

              <Box
                testID={BridgeViewSelectorsIDs.RECURRING_BANNERS_WRAPPER}
                onLayout={handleBannersLayout}
                twClassName={hasVisibleBanner ? 'mt-2' : undefined}
                onTouchEnd={dismissInputAndKeypad}
              >
                <SwapsBanners
                  gap={2}
                  onAdjustSourceAmount={handleSourcePresetAmountSelect}
                >
                  <HardwareWalletUnsupportedBanner />
                  <QuoteErrorBanner />
                  <TokenWarningBanner />
                  <DestAssetRequireActivateBanner />
                  <InsufficientNativeReserveBanner />
                  <MissingQuoteAndAssetsPriceDataBanner />
                  <SentinelFeeTokenErrorBanner
                    reason={feeTokenValidation.reason}
                    unsupportedPairMessage={strings(
                      'bridge.recurring.unsupported_fee_token_pair',
                      {
                        supportedTokens:
                          feeTokenValidation.reason === 'unsupported-pair'
                            ? feeTokenValidation.supportedTokenSymbols.join(
                                ', ',
                              )
                            : '',
                      },
                    )}
                    unavailableMessage={strings(
                      'bridge.recurring.fee_tokens_unavailable',
                    )}
                    retryLabel={strings('bridge.recurring.try_again')}
                    onRetry={feeTokenValidation.retry}
                    testIDs={FEE_TOKEN_ERROR_BANNER_TEST_IDS}
                  />
                </SwapsBanners>
              </Box>
            </Box>

            <PriceRangeRow
              token={priceRange ? priceRangeToken : undefined}
              minLabel={priceRangeMinLabel}
              maxLabel={priceRangeMaxLabel}
              onPress={handlePriceRangePress}
            />
            <Box twClassName="pb-4">
              <CostToleranceRow
                value={`${recurringPriceTolerance ?? defaultPriceTolerance}%`}
                onPress={handlePriceTolerancePress}
              />
            </Box>

            <Box onTouchEnd={dismissInputAndKeypad}>
              <OrdersTabs
                enabledChainIds={enabledChainIds}
                openOrders={openOrders}
                history={history}
                activeTab={recurringOrdersTab}
                onTabChange={setRecurringOrdersTab}
              />
            </Box>
          </Box>
        </ScrollView>

        <BridgeRecurringBuyFooterView
          onPreviewOrder={handlePreviewOrder}
          label={previewOrderLabel}
          destinationTokenSymbol={destToken?.symbol}
          isBelowMinAmount={isBelowMinAmount}
          isPreviewDisabled={
            !scheduleValidation.isValid ||
            !feeTokenValidation.isValid ||
            hasMinAmountError ||
            isBelowMinAmount
          }
        />

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          onClose={blurInputs}
          {...keypadProps}
        >
          {sourceAmount && sourceAmount !== '0' ? (
            <SwapsRecurringBuyConfirmButton
              onPress={handlePreviewOrder}
              label={previewOrderLabel}
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
              disabled={!canPreviewOrder}
              loading={isLoading && !isBelowMinAmount}
            />
          ) : isAmountFocused ? (
            <GaslessQuickPickOptions
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              onMaxPress={handleSourceMaxPress}
              isQuoteSponsored={isQuoteSponsored}
              onAmountSelect={handleSourcePresetAmountSelect}
            />
          ) : null}
        </SwapsKeypad>
      </Box>
    </Box>
  );
};

export default BridgeRecurringBuyViewContent;
