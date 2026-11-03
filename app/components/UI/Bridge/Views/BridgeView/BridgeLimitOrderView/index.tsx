import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  FeatureId,
  formatAddressToAssetId,
  formatChainIdToCaip,
  type MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  selectLimitOrderCostTolerance,
  selectLimitOrderExpirationMinutes,
  selectOrdersNetworkFilter,
  setLimitOrderExpirationMinutes,
  setLimitOrderMarketComparison,
} from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectBridgeLimitOrderDefaultCostTolerance } from '../../../../../../selectors/bridge/featureFlags';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import OrdersTabs, { OrdersTabKey } from '../../../components/OrdersTabs';
import {
  DestAssetRequireActivateBanner,
  SwapsBanners,
  TokenWarningBanner,
  MissingAssetsPriceDataBanner,
  HardwareWalletUnsupportedBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { useLimitOrderSwapInputs } from '../../../hooks/useLimitOrderSwapsInput';
import { useLimitOrders } from '../../../hooks/useLimitOrders';
import { BridgeLimitOrderFooterView } from './BridgeLimitOrderFooterView';
import { SwapsLimitOrderConfirmButton } from '../../../components/SwapsLimitOrderConfirmButton';
import LimitOrderDetails from '../../../components/LimitOrderDetails';
import { LimitOrderPriceAdjustCard } from '../../../components/LimitOrderPriceAdjustCard';
import type {
  ButtonPricePresetsSectionRef,
  InputSectionRef,
} from '../../../components/LimitOrderPriceAdjustCard/types';
import {
  HISTORY_LIMIT_ORDER_STATES,
  LIMIT_ORDER_BUTTON_PRICE_PRESETS,
  LIMIT_ORDERS_CONSTRAINED_REFETCH_INTERVAL,
  LIMIT_ORDERS_REFETCH_INTERVAL,
  LOAD_MORE_LIMIT_ORDERSSCROLL_THRESHOLD,
  OPEN_LIMIT_ORDER_STATES,
  SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
  getSwapsLimitOrderExpirationLabel,
  type SwapsLimitOrderExpirationMinutes,
  LIMIT_ORDER_DIRECTION,
} from '../../../constants/limitOrders';
import { useSwapsLimitOrderPriceAdjust } from '../../../hooks/useSwapsLimitOrderPriceAdjust';
import { useSwapsLimitOrderKeypad } from '../../../hooks/useSwapsLimitOrderKeypad';
import {
  useScrollIntoViewAboveKeypad,
  type MeasureInWindow,
} from '../../../hooks/useScrollIntoViewAboveKeypad';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { formatSubscriptNotation } from '../../../../../../util/number/subscriptNotation';
import {
  formatMinimumReceived,
  getCurrencySymbol,
} from '../../../utils/currencyUtils';
import { formatAmountWithLocaleSeparators } from '../../../utils/formatAmountWithLocaleSeparators';
import { getSwapsLimitOrderDestTokenAmount } from '../../../utils/limitOrders/getSwapsLimitOrderDestTokenAmount';
import { strings } from '../../../../../../../locales/i18n';
import { useHasMissingAssetsPriceData } from '../../../hooks/useHasMissingAssetsPriceData';
import { useIsHardwareWalletForBridge } from '../../../hooks/useIsHardwareWalletForBridge';
import { useLimitOrderMinAmount } from '../../../hooks/useLimitOrderMinAmount';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import {
  createLimitOrdersTab,
  getHistoryLimitOrderDate,
  getOpenLimitOrderDate,
} from '../../../utils/limitOrders/createLimitOrdersTab';
import { getLimitOrderDelegationsParams } from '../../../utils/limitOrders/getLimitOrderDelegationsParams';
import { useSentinelFeeTokenValidation } from '../../../hooks/useSentinelFeeTokenValidation';
import { SentinelFeeTokenErrorBanner } from '../SentinelFeeTokenErrorBanner';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const FEE_TOKEN_ERROR_BANNER_TEST_IDS = {
  unsupportedPair: BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_UNSUPPORTED_BANNER,
  unavailable: BridgeViewSelectorsIDs.LIMIT_FEE_TOKENS_UNAVAILABLE_BANNER,
  retryButton: BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_RETRY_BUTTON,
};

const formatTokenAmountValue = (
  amount: string | undefined,
  symbol: string | undefined,
) => (amount && symbol ? `${formatMinimumReceived(amount)} ${symbol}` : '--');

const BridgeLimitOrderViewContent = ({
  location,
}: {
  location: MetaMetricsSwapsEventSource;
}) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const defaultCostTolerance = useSelector(
    selectBridgeLimitOrderDefaultCostTolerance,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const inputRef = useRef<TokenInputAreaRef>(null);
  const limitPriceInputRef = useRef<InputSectionRef>(null);
  const customPercentInputRef = useRef<ButtonPricePresetsSectionRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    latestSourceBalance,
    limitOrdersTab = OrdersTabKey.OpenOrders,
    setLimitOrdersTab = () => undefined,
  } = useBridgeSession();
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const walletAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const ordersNetworkFilter = useSelector(selectOrdersNetworkFilter);
  const {
    destToken,
    enabledChainIds,
    handleDestTokenPress,
    handleFlipTokensPress,
    handleSourceMaxPress,
    handleSourcePresetAmountSelect,
    handleSourceTokenPress,
    isFlipDisabled,
    sourceAmountInput,
    sourceToken,
    sourceAmount,
    isSourceNetworkGasSponsored,
  } = useLimitOrderSwapInputs();
  const orderChainId = sourceToken
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
  const feeTokenValidation = useSentinelFeeTokenValidation({
    chainId: orderChainId,
    sourceAssetId,
    destinationAssetId,
  });
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  let ordersRefetchInterval: number | undefined = LIMIT_ORDERS_REFETCH_INTERVAL;
  if (networkTier === 'NONE') {
    ordersRefetchInterval = undefined;
  } else if (hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR') {
    ordersRefetchInterval = LIMIT_ORDERS_CONSTRAINED_REFETCH_INTERVAL;
  }
  const openOrdersQuery = useLimitOrders({
    walletAddress,
    states: OPEN_LIMIT_ORDER_STATES,
    chainId: ordersNetworkFilter,
    enabled: limitOrdersTab === OrdersTabKey.OpenOrders,
    refetchInterval: ordersRefetchInterval,
  });
  const historyQuery = useLimitOrders({
    walletAddress,
    states: HISTORY_LIMIT_ORDER_STATES,
    chainId: ordersNetworkFilter,
    enabled: limitOrdersTab === OrdersTabKey.History,
    refetchInterval: ordersRefetchInterval,
  });
  const {
    commitCustomPercent,
    counterFiatRate,
    counterToken,
    customValue,
    handleCustomPress,
    handleCustomValueChange,
    handleLimitPriceChange,
    handleMarketPress,
    handlePercentPress,
    isCustomActive,
    isLimitFiatMode,
    isTriggerPriceNearMarket,
    executionType,
    limitPrice,
    limitPriceDecimals,
    marketComparison,
    priceComparisonDirection,
    onAmountTypeTogglePress,
    onQuoteUnitPress,
    quotedSymbol,
    quotedToken,
    secondaryValue,
    value,
  } = useSwapsLimitOrderPriceAdjust({
    destToken,
    sourceToken,
  });
  const {
    close: closeKeypad,
    customPercentSelection,
    focusAmount,
    focusCustomPercent,
    focusLimitPrice,
    handleChange: handleKeypadChange,
    handleCustomPercentSelectionChange,
    handleKeypadClose,
    handleLimitPriceSelectionChange,
    isAmountFocused,
    isCustomPercentFocused,
    isCustomPercentKeypadOpen,
    keypadProps,
    keypadRef,
    limitPriceSelection,
  } = useSwapsLimitOrderKeypad({
    customPercent: customValue,
    isLimitFiatMode,
    limitPrice,
    limitPriceDecimals,
    nativeToken: counterToken,
    onCustomPercentChange: handleCustomValueChange,
    onLimitPriceChange: handleLimitPriceChange,
    sourceAmountInput,
  });

  const measureCustomPercentInput = useCallback<MeasureInWindow>(
    (callback) => customPercentInputRef.current?.measureInWindow(callback),
    [],
  );

  // The keypad is laid over the screen and can cover the custom percent input
  // on short devices, so the input is scrolled above it.
  const {
    keypadLayoutProps,
    keypadOverlap,
    onScroll: trackScrollOffset,
    onScrollViewLayout,
    onContentSizeChange,
  } = useScrollIntoViewAboveKeypad({
    isTargetActive: isCustomActive && isCustomPercentFocused,
    scrollViewRef,
    measureTarget: measureCustomPercentInput,
  });

  const { onClose: onKeypadLayoutClose } = keypadLayoutProps;
  const onKeypadClose = useCallback(() => {
    onKeypadLayoutClose();
    handleKeypadClose();
  }, [handleKeypadClose, onKeypadLayoutClose]);

  // Limit orders are not quoted, so the destination amount is derived from the
  // amount being paid and the price the order would trigger at.
  const destTokenAmount = useMemo(
    () =>
      getSwapsLimitOrderDestTokenAmount({
        counterFiatRate,
        destTokenDecimals: destToken?.decimals,
        executionType,
        isLimitFiatMode,
        limitPrice,
        sourceAmount,
      }),
    [
      counterFiatRate,
      destToken?.decimals,
      executionType,
      isLimitFiatMode,
      limitPrice,
      sourceAmount,
    ],
  );

  const handleFlipPress = useCallback(() => {
    // A zero estimate is nothing to carry over, so the source input is cleared
    // rather than seeded with it.
    handleFlipTokensPress(
      destTokenAmount && Number(destTokenAmount) > 0
        ? destTokenAmount
        : undefined,
    );
  }, [destTokenAmount, handleFlipTokensPress]);

  const isHardwareWallet = useIsHardwareWalletForBridge();

  const [hasVisibleBanner, setHasVisibleBanner] = useState(false);
  const isMissingPrice = useHasMissingAssetsPriceData();
  const { isBelowMinAmount, minAmountUsd } = useLimitOrderMinAmount({
    sourceToken,
    sourceAmount,
  });
  const hasNonZeroSourceAmount =
    Boolean(sourceAmount) && Number(sourceAmount) > 0;
  const hasValidLimitPrice = Boolean(limitPrice) && Number(limitPrice) > 0;
  const isCreateOrderDisabled =
    !hasValidLimitPrice ||
    isMissingPrice ||
    isHardwareWallet ||
    isBelowMinAmount ||
    !feeTokenValidation.isValid;
  const createOrderLabel =
    isBelowMinAmount && minAmountUsd !== undefined
      ? strings('bridge.limit.min_order_amount', {
          amount: formatAmountWithLocaleSeparators(String(minAmountUsd)),
        })
      : strings('bridge.limit.create_order');
  const expirationMinutes =
    useSelector(selectLimitOrderExpirationMinutes) ??
    SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES;

  const blurLimitAdjustInputs = useCallback(() => {
    limitPriceInputRef.current?.blur();
    customPercentInputRef.current?.blur();
  }, []);

  const commitCustomPercentIfFocused = useCallback(() => {
    if (isCustomPercentFocused) {
      commitCustomPercent();
    }
  }, [commitCustomPercent, isCustomPercentFocused]);

  const dismissInputAndKeypad = useCallback(() => {
    commitCustomPercentIfFocused();
    inputRef.current?.blur();
    blurLimitAdjustInputs();
    closeKeypad();
  }, [blurLimitAdjustInputs, closeKeypad, commitCustomPercentIfFocused]);

  const openOrders = createLimitOrdersTab({
    orders: openOrdersQuery.orders,
    totalCount: openOrdersQuery.total,
    isLoading: openOrdersQuery.isLoading,
    isError: openOrdersQuery.isError,
    isFetchingNextPage: openOrdersQuery.isFetchingNextPage,
    onRetry: () => openOrdersQuery.refetch(),
    getItemDate: getOpenLimitOrderDate,
  });

  const history = createLimitOrdersTab({
    orders: historyQuery.orders,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    isFetchingNextPage: historyQuery.isFetchingNextPage,
    onRetry: () => historyQuery.refetch(),
    getItemDate: getHistoryLimitOrderDate,
  });

  const handleOrdersScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      trackScrollOffset(event);

      const { nativeEvent } = event;
      const distanceFromBottom =
        nativeEvent.contentSize.height -
        nativeEvent.layoutMeasurement.height -
        nativeEvent.contentOffset.y;

      if (distanceFromBottom > LOAD_MORE_LIMIT_ORDERSSCROLL_THRESHOLD) {
        return;
      }

      if (limitOrdersTab === OrdersTabKey.OpenOrders) {
        openOrdersQuery.fetchNextPage();
        return;
      }

      historyQuery.fetchNextPage();
    },
    [historyQuery, limitOrdersTab, openOrdersQuery, trackScrollOffset],
  );

  const handleOrdersRefresh = useCallback(async () => {
    const activeOrdersQuery =
      limitOrdersTab === OrdersTabKey.OpenOrders
        ? openOrdersQuery
        : historyQuery;

    setIsRefreshingOrders(true);
    try {
      await activeOrdersQuery.refresh();
    } finally {
      setIsRefreshingOrders(false);
    }
  }, [historyQuery, limitOrdersTab, openOrdersQuery]);

  const onSourceInputPress = useCallback(() => {
    commitCustomPercentIfFocused();
    focusAmount();
  }, [commitCustomPercentIfFocused, focusAmount]);

  const onLimitPriceInputPress = useCallback(() => {
    commitCustomPercentIfFocused();
    focusLimitPrice();
  }, [commitCustomPercentIfFocused, focusLimitPrice]);

  const closeKeypadWithoutCommit = useCallback(() => {
    inputRef.current?.blur();
    blurLimitAdjustInputs();
    closeKeypad();
  }, [blurLimitAdjustInputs, closeKeypad]);

  const onMarketPresetPress = useCallback(() => {
    handleMarketPress();
    closeKeypadWithoutCommit();
  }, [closeKeypadWithoutCommit, handleMarketPress]);

  const onPercentPresetPress = useCallback(
    (percent: number) => {
      handlePercentPress(percent);
      closeKeypadWithoutCommit();
    },
    [closeKeypadWithoutCommit, handlePercentPress],
  );

  const onCustomPresetPress = useCallback(() => {
    handleCustomPress();
    focusCustomPercent();
  }, [focusCustomPercent, handleCustomPress]);

  const handleBannersLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHasVisibleBanner = event.nativeEvent.layout.height > 0;
    setHasVisibleBanner((current) =>
      current === nextHasVisibleBanner ? current : nextHasVisibleBanner,
    );
  }, []);

  const handleCostTolerancePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen:
        Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_DEFAULT_COST_TOLERANCE_MODAL,
    });
  }, [navigation]);

  const handleExpirationSelect = useCallback(
    (minutes: SwapsLimitOrderExpirationMinutes) => {
      dispatch(setLimitOrderExpirationMinutes(minutes));
    },
    [dispatch],
  );

  const handleExpirationPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_EXPIRATION_MODAL,
      params: {
        selectedMinutes: expirationMinutes,
        onSelect: handleExpirationSelect,
      },
    });
  }, [
    dismissInputAndKeypad,
    expirationMinutes,
    handleExpirationSelect,
    navigation,
  ]);

  const expiration = getSwapsLimitOrderExpirationLabel(expirationMinutes);
  const costToleranceLabel = `${costTolerance ?? defaultCostTolerance}%`;
  const formattedLimitPrice =
    formatSubscriptNotation(Number(value)) ??
    formatAmountWithLocaleSeparators(value);
  let triggerPrice = formattedLimitPrice;
  if (isLimitFiatMode) {
    triggerPrice = `${getCurrencySymbol(currentCurrency || 'usd')}${formattedLimitPrice}`;
  } else if (counterToken?.symbol) {
    triggerPrice = strings('bridge.limit.quote_unit', {
      amount: formattedLimitPrice,
      symbol: counterToken.symbol,
    });
  }

  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleCreateOrderPress = useCallback(() => {
    if (!feeTokenValidation.isValid) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ADVANCED_ORDER_SUBMITTED)
        .addProperties({
          location,
          feature_id: FeatureId.LIMIT_ORDER,
          order_type: `${executionType}_${LIMIT_ORDER_DIRECTION[priceComparisonDirection].threshold}`,
        })
        .build(),
    );

    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_CONFIRMATION_MODAL,
      params: {
        sourceToken,
        destToken,
        payingAmount: formatTokenAmountValue(sourceAmount, sourceToken?.symbol),
        estReceivingAmount: formatTokenAmountValue(
          destTokenAmount,
          destToken?.symbol,
        ),
        triggerPrice,
        triggerToken: quotedToken,
        expiry: expiration,
        order: getLimitOrderDelegationsParams({
          sourceToken,
          destToken,
          sourceAmount,
          destTokenAmount,
          expiresInMinutes: expirationMinutes,
        }),
        triggerInput: {
          executionType,
          isLimitFiatMode,
          limitPrice,
          priceComparisonDirection,
        },
      },
    });
  }, [
    destToken,
    destTokenAmount,
    dismissInputAndKeypad,
    expiration,
    executionType,
    expirationMinutes,
    feeTokenValidation.isValid,
    isLimitFiatMode,
    limitPrice,
    navigation,
    priceComparisonDirection,
    quotedToken,
    sourceAmount,
    sourceToken,
    triggerPrice,
    trackEvent,
    createEventBuilder,
    location,
  ]);

  // Keeps the market-comparison label in sync everywhere it's shown: this
  // screen keeps running (and this effect keeps firing) behind the
  // confirmation modal, which reads the same Redux value instead of
  // deriving its own, so the two surfaces never disagree.
  useEffect(() => {
    dispatch(setLimitOrderMarketComparison(marketComparison));
  }, [dispatch, marketComparison]);

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        twClassName="flex-1 min-h-0"
        testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
      >
        <ScrollView
          ref={scrollViewRef}
          testID={BridgeViewSelectorsIDs.LIMIT_ORDER_SCROLL}
          style={tw.style('flex-1 min-h-0')}
          contentContainerStyle={tw.style('grow', {
            paddingBottom: keypadOverlap,
          })}
          onLayout={onScrollViewLayout}
          onContentSizeChange={onContentSizeChange}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={dismissInputAndKeypad}
          onScroll={handleOrdersScroll}
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
            testID={BridgeViewSelectorsIDs.LIMIT_ORDER_DISMISS_AREA}
            onStartShouldSetResponder={() => true}
            onResponderRelease={dismissInputAndKeypad}
          >
            <SwapsInputs
              inputRef={inputRef}
              sourceToken={sourceToken}
              sourceAmountInput={sourceAmountInput}
              destToken={destToken}
              destTokenAmount={destTokenAmount}
              isDestAmountLoading={false}
              isFlipDisabled={isFlipDisabled}
              onSourceInputPress={onSourceInputPress}
              onSourceTokenPress={handleSourceTokenPress}
              onSourceMaxPress={handleSourceMaxPress}
              onFlipPress={handleFlipPress}
              onDestInputPress={closeKeypad}
              onDestTokenPress={handleDestTokenPress}
              sourceTokenAreaTestID={
                BridgeViewSelectorsIDs.LIMIT_SOURCE_TOKEN_AREA
              }
              destTokenAreaTestID={BridgeViewSelectorsIDs.LIMIT_DEST_TOKEN_AREA}
              sourceAmountTypeToggleTestID={
                BridgeViewSelectorsIDs.LIMIT_SOURCE_AMOUNT_TYPE_TOGGLE
              }
            />

            <LimitOrderPriceAdjustCard
              hasVisibleBanner={hasVisibleBanner}
              onDismissKeypad={dismissInputAndKeypad}
              orderSide={executionType}
              quoteTokenSymbol={quotedSymbol}
              quoteToken={quotedToken}
              isLimitFiatMode={isLimitFiatMode}
              priceUnitSymbol={
                isLimitFiatMode ? undefined : counterToken?.symbol
              }
              onQuoteUnitPress={onQuoteUnitPress}
              limitPrice={value}
              onLimitPriceInputPress={onLimitPriceInputPress}
              isLimitPriceInputPressDisabled={isCustomPercentKeypadOpen}
              limitPriceSelection={limitPriceSelection}
              onLimitPriceSelectionChange={handleLimitPriceSelectionChange}
              secondaryLimitPrice={secondaryValue}
              onAmountTypeTogglePress={onAmountTypeTogglePress}
              marketComparison={marketComparison}
              isTriggerPriceNearMarket={isTriggerPriceNearMarket}
              priceComparisonDirection={priceComparisonDirection}
              pricePresets={LIMIT_ORDER_BUTTON_PRICE_PRESETS}
              isCustomPercentActive={isCustomActive}
              customPercent={customValue}
              customPercentSelection={customPercentSelection}
              onMarketPresetPress={onMarketPresetPress}
              onPercentPresetPress={onPercentPresetPress}
              onCustomPresetPress={onCustomPresetPress}
              onCustomPercentInputPress={focusCustomPercent}
              onCustomPercentSelectionChange={
                handleCustomPercentSelectionChange
              }
              limitPriceInputRef={limitPriceInputRef}
              customPercentInputRef={customPercentInputRef}
            />

            <Box
              twClassName="flex-grow-0 pb-3"
              onTouchEnd={dismissInputAndKeypad}
            >
              <Box onLayout={handleBannersLayout}>
                <SwapsBanners
                  onAdjustSourceAmount={handleSourcePresetAmountSelect}
                >
                  <HardwareWalletUnsupportedBanner />
                  <TokenWarningBanner />
                  <DestAssetRequireActivateBanner />
                  <MissingAssetsPriceDataBanner />
                  <SentinelFeeTokenErrorBanner
                    reason={feeTokenValidation.reason}
                    unsupportedPairMessage={strings(
                      'bridge.limit.unsupported_fee_token_pair',
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
                      'bridge.limit.fee_tokens_unavailable',
                    )}
                    retryLabel={strings('bridge.limit.try_again')}
                    onRetry={feeTokenValidation.retry}
                    testIDs={FEE_TOKEN_ERROR_BANNER_TEST_IDS}
                  />
                </SwapsBanners>
              </Box>
            </Box>

            <Box twClassName="flex-grow-0" onTouchEnd={dismissInputAndKeypad}>
              <LimitOrderDetails
                expiration={expiration}
                onExpirationPress={handleExpirationPress}
                costTolerance={costToleranceLabel}
                onCostTolerancePress={handleCostTolerancePress}
              />
            </Box>

            <Box
              twClassName="grow"
              onTouchEnd={dismissInputAndKeypad}
              paddingBottom={3}
            >
              <OrdersTabs
                enabledChainIds={enabledChainIds}
                openOrders={openOrders}
                history={history}
                activeTab={limitOrdersTab}
                onTabChange={setLimitOrdersTab}
              />
            </Box>
          </Box>
        </ScrollView>

        <BridgeLimitOrderFooterView
          ctaDisabled={isCreateOrderDisabled}
          onCTAPress={handleCreateOrderPress}
          ctaLabel={createOrderLabel}
        />

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          {...keypadLayoutProps}
          {...keypadProps}
          onClose={onKeypadClose}
        >
          {hasNonZeroSourceAmount ? (
            <SwapsLimitOrderConfirmButton
              onPress={handleCreateOrderPress}
              label={createOrderLabel}
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
              disabled={isCreateOrderDisabled}
            />
          ) : isAmountFocused ? (
            <GaslessQuickPickOptions
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              onMaxPress={handleSourceMaxPress}
              isQuoteSponsored={isSourceNetworkGasSponsored}
              onAmountSelect={handleSourcePresetAmountSelect}
            />
          ) : null}
        </SwapsKeypad>
      </Box>
    </Box>
  );
};

export default BridgeLimitOrderViewContent;
