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
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  selectLimitOrderCostTolerance,
  selectOrdersNetworkFilter,
  setLimitOrderCostTolerance,
  setLimitOrderMarketComparison,
} from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
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
import { LimitOrderState } from '../../../api/limitOrders/getLimitOrders/types';
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
  LIMIT_ORDER_DEFAULT_COST_TOLERANCE,
  LOAD_MORE_LIMIT_ORDERSSCROLL_THRESHOLD,
  OPEN_LIMIT_ORDER_STATES,
  SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
  getSwapsLimitOrderExpirationLabel,
  type SwapsLimitOrderExpirationMinutes,
} from '../../../constants/limitOrders';
import { useSwapsLimitOrderPriceAdjust } from '../../../hooks/useSwapsLimitOrderPriceAdjust';
import { useSwapsLimitOrderKeypad } from '../../../hooks/useSwapsLimitOrderKeypad';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import {
  formatMinimumReceived,
  getCurrencySymbol,
} from '../../../utils/currencyUtils';
import { formatAmountWithLocaleSeparators } from '../../../utils/formatAmountWithLocaleSeparators';
import { getSwapsLimitOrderDestTokenAmount } from '../../../utils/limitOrders/getSwapsLimitOrderDestTokenAmount';
import { strings } from '../../../../../../../locales/i18n';
import { useHasMissingAssetsPriceData } from '../../../hooks/useHasMissingAssetsPriceData';
import { useIsHardwareWalletForBridge } from '../../../hooks/useIsHardwareWalletForBridge';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import { createLimitOrdersTab } from '../../../utils/limitOrders/createLimitOrdersTab';
import { getLimitOrderDelegationsParams } from '../../../utils/limitOrders/getLimitOrderDelegationsParams';
import { getLimitOrderTriggerParams } from '../../../utils/limitOrders/getLimitOrderTriggerParams';
import { useFiatToUsdRate } from '../../../hooks/useFiatToUsdRate';

const formatTokenAmountValue = (
  amount: string | undefined,
  symbol: string | undefined,
) => (amount && symbol ? `${formatMinimumReceived(amount)} ${symbol}` : '--');

const BridgeLimitOrderViewContent = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const inputRef = useRef<TokenInputAreaRef>(null);
  const limitPriceInputRef = useRef<InputSectionRef>(null);
  const customPercentInputRef = useRef<ButtonPricePresetsSectionRef>(null);
  const { latestSourceBalance } = useBridgeSession();
  const [activeOrdersTab, setActiveOrdersTab] = useState(
    OrdersTabKey.OpenOrders,
  );
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
  const openOrdersQuery = useLimitOrders({
    walletAddress,
    states: OPEN_LIMIT_ORDER_STATES,
    chainId: ordersNetworkFilter,
    enabled: activeOrdersTab === OrdersTabKey.OpenOrders,
  });
  const historyQuery = useLimitOrders({
    walletAddress,
    states: HISTORY_LIMIT_ORDER_STATES,
    chainId: ordersNetworkFilter,
    enabled: activeOrdersTab === OrdersTabKey.History,
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
    handleLimitPriceSelectionChange,
    isAmountFocused,
    isCustomPercentFocused,
    keypadProps,
    keypadRef,
    limitPriceSelection,
  } = useSwapsLimitOrderKeypad({
    customPercent: customValue,
    isLimitFiatMode,
    limitPrice,
    nativeToken: counterToken,
    onCustomPercentChange: handleCustomValueChange,
    onLimitPriceChange: handleLimitPriceChange,
    sourceAmountInput,
  });

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
  const [expirationMinutes, setExpirationMinutes] =
    useState<SwapsLimitOrderExpirationMinutes>(
      SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
    );

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
    isLoading: openOrdersQuery.isLoading,
    isError: openOrdersQuery.isError,
    isFetchingNextPage: openOrdersQuery.isFetchingNextPage,
    onRetry: () => openOrdersQuery.refetch(),
  });

  const history = createLimitOrdersTab({
    orders: historyQuery.orders,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    isFetchingNextPage: historyQuery.isFetchingNextPage,
    onRetry: () => historyQuery.refetch(),
  });

  const handleOrdersScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const distanceFromBottom =
        nativeEvent.contentSize.height -
        nativeEvent.layoutMeasurement.height -
        nativeEvent.contentOffset.y;

      if (distanceFromBottom > LOAD_MORE_LIMIT_ORDERSSCROLL_THRESHOLD) {
        return;
      }

      if (activeOrdersTab === OrdersTabKey.OpenOrders) {
        openOrdersQuery.fetchNextPage();
        return;
      }

      historyQuery.fetchNextPage();
    },
    [activeOrdersTab, historyQuery, openOrdersQuery],
  );

  const handleOrdersRefresh = useCallback(async () => {
    const activeOrdersQuery =
      activeOrdersTab === OrdersTabKey.OpenOrders
        ? openOrdersQuery
        : historyQuery;

    setIsRefreshingOrders(true);
    try {
      await activeOrdersQuery.refresh();
    } finally {
      setIsRefreshingOrders(false);
    }
  }, [activeOrdersTab, historyQuery, openOrdersQuery]);

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

  const handleExpirationConfirm = useCallback(
    (minutes: SwapsLimitOrderExpirationMinutes) => {
      setExpirationMinutes(minutes);
    },
    [],
  );

  const handleExpirationPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_EXPIRATION_MODAL,
      params: {
        selectedMinutes: expirationMinutes,
        onConfirm: handleExpirationConfirm,
      },
    });
  }, [
    dismissInputAndKeypad,
    expirationMinutes,
    handleExpirationConfirm,
    navigation,
  ]);

  const expiration = getSwapsLimitOrderExpirationLabel(expirationMinutes);
  const costToleranceLabel = `${
    costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE
  }%`;
  const triggerPrice = `${
    isLimitFiatMode ? getCurrencySymbol(currentCurrency || 'usd') : ''
  }${formatAmountWithLocaleSeparators(value)}`;

  // The order is placed with the USD equivalent of the limit price, which the
  // display currency only matches when it is already USD.
  const fiatToUsdRate = useFiatToUsdRate(sourceToken?.chainId);
  const trigger = useMemo(
    () =>
      getLimitOrderTriggerParams({
        executionType,
        isLimitFiatMode,
        limitPrice,
        priceComparisonDirection,
        fiatToUsdRate,
      }),
    [
      executionType,
      fiatToUsdRate,
      isLimitFiatMode,
      limitPrice,
      priceComparisonDirection,
    ],
  );

  const handleCreateOrderPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_CONFIRMATION_MODAL,
      params: {
        sourceToken,
        destToken,
        payingAmount: formatTokenAmountValue(sourceAmount, sourceToken?.symbol),
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
        trigger,
      },
    });
  }, [
    destToken,
    destTokenAmount,
    dismissInputAndKeypad,
    expiration,
    expirationMinutes,
    navigation,
    quotedToken,
    sourceAmount,
    sourceToken,
    trigger,
    triggerPrice,
  ]);

  // Reset cost tolerance when navigating to limit orders screen.
  useEffect(() => {
    dispatch(setLimitOrderCostTolerance(LIMIT_ORDER_DEFAULT_COST_TOLERANCE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          testID={BridgeViewSelectorsIDs.LIMIT_ORDER_SCROLL}
          style={tw.style('flex-1 min-h-0')}
          contentContainerStyle={tw.style('grow')}
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
              isLimitFiatMode={isLimitFiatMode}
              priceUnitSymbol={
                isLimitFiatMode ? undefined : counterToken?.symbol
              }
              onQuoteUnitPress={onQuoteUnitPress}
              limitPrice={value}
              onLimitPriceInputPress={onLimitPriceInputPress}
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

            <Box onTouchEnd={dismissInputAndKeypad} paddingBottom={3}>
              <OrdersTabs
                enabledChainIds={enabledChainIds}
                openOrders={openOrders}
                history={history}
                onTabChange={setActiveOrdersTab}
              />
            </Box>
          </Box>
        </ScrollView>

        <BridgeLimitOrderFooterView
          ctaDisabled={isMissingPrice || isHardwareWallet}
          onCTAPress={handleCreateOrderPress}
          ctaLabel={strings('bridge.limit.create_order')}
        />

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          {...keypadProps}
        >
          {isAmountFocused && sourceAmount && sourceAmount !== '0' ? (
            <SwapsLimitOrderConfirmButton
              onPress={handleCreateOrderPress}
              label={strings('bridge.limit.create_order')}
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
              disabled={isMissingPrice || isHardwareWallet}
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
