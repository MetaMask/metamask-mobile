import React, { useCallback, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  selectOrdersNetworkFilter,
  selectRecurringPriceRange,
  selectRecurringScheduleValidation,
} from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import OrdersTabs, { OrdersTabKey } from '../../../components/OrdersTabs';
import PriceRangeRow from '../../../components/PriceRangeRow';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
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
import {
  BridgeQuoteDataProvider,
  useBridgeQuoteDataContext,
} from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useRecurringOrders } from '../../../hooks/useRecurringOrders';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import {
  formatPriceRangeBounds,
  PRICE_RANGE_CURRENCY,
} from '../../../utils/priceRange';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import {
  type RecurringOrder,
  RecurringOrderStatus,
} from '../../../api/recurringOrders.types';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import { BridgeRecurringBuyFooterView } from './BridgeRecurringBuyFooterView';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import { createRecurringOrdersTab } from './RecurringOrderRow';

const OPEN_ORDER_STATUSES = [RecurringOrderStatus.Open];
const HISTORY_ORDER_STATUSES = [
  RecurringOrderStatus.Completed,
  RecurringOrderStatus.Cancelled,
];
const LOAD_MORE_SCROLL_THRESHOLD = 200;

const BridgeRecurringBuyViewContent = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const inputRef = useRef<TokenInputAreaRef>(null);
  const [activeOrdersTab, setActiveOrdersTab] = useState(
    OrdersTabKey.OpenOrders,
  );

  const { latestSourceBalance } = useBridgeSession();
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
    sourceAmountInput,
    sourceToken,
    sourceAmount,
  } = useRecurringBuySwapInputs();

  const priceRange = useSelector(selectRecurringPriceRange);
  const walletAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const ordersNetworkFilter = useSelector(selectOrdersNetworkFilter);
  const scheduleValidation = useSelector(selectRecurringScheduleValidation);
  const { activeQuote, isLoading } = useBridgeQuoteDataContext();
  const openOrdersQuery = useRecurringOrders({
    walletAddress,
    status: OPEN_ORDER_STATUSES,
    chainId: ordersNetworkFilter,
    enabled: activeOrdersTab === OrdersTabKey.OpenOrders,
  });
  const historyQuery = useRecurringOrders({
    walletAddress,
    status: HISTORY_ORDER_STATUSES,
    chainId: ordersNetworkFilter,
    enabled: activeOrdersTab === OrdersTabKey.History,
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

  const dismissInputAndKeypad = useCallback(() => {
    inputRef.current?.blur();
    closeKeypad();
  }, [closeKeypad]);

  const canPreviewOrder = Boolean(activeQuote) && scheduleValidation.isValid;

  const handlePreviewOrder = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_CONFIRM_ORDER_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

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

      if (activeOrdersTab === OrdersTabKey.OpenOrders) {
        openOrdersQuery.fetchNextPage();
        return;
      }

      historyQuery.fetchNextPage();
    },
    [activeOrdersTab, historyQuery, openOrdersQuery],
  );

  const priceRangeToken =
    priceRange?.tokenSide === 'source' ? sourceToken : destToken;
  const { minLabel: priceRangeMinLabel, maxLabel: priceRangeMaxLabel } =
    formatPriceRangeBounds(
      priceRange?.min ?? '',
      priceRange?.max ?? '',
      PRICE_RANGE_CURRENCY,
    );

  const handlePriceRangePress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_PRICE_RANGE_MODAL,
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
          contentContainerStyle={tw.style('grow-0')}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={dismissInputAndKeypad}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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

          <Box onTouchEnd={dismissInputAndKeypad}>
            <SwapsBanners onAdjustSourceAmount={handleSourcePresetAmountSelect}>
              <HardwareWalletUnsupportedBanner />
              <QuoteErrorBanner />
              <TokenWarningBanner />
              <DestAssetRequireActivateBanner />
              <InsufficientNativeReserveBanner />
              <MissingQuoteAndAssetsPriceDataBanner />
            </SwapsBanners>
          </Box>

          <RecurringScheduleFields
            onEveryPress={focusEvery}
            onRepeatPress={focusRepeat}
            onDismissKeypad={dismissInputAndKeypad}
            onUnitPress={handleUnitPress}
            onRepeatInfoPress={handleRepeatInfoPress}
          />

          <PriceRangeRow
            token={priceRange ? priceRangeToken : undefined}
            minLabel={priceRangeMinLabel}
            maxLabel={priceRangeMaxLabel}
            onPress={handlePriceRangePress}
          />

          <Box onTouchEnd={dismissInputAndKeypad}>
            <OrdersTabs
              enabledChainIds={enabledChainIds}
              openOrders={openOrders}
              history={history}
              onTabChange={setActiveOrdersTab}
            />
          </Box>
        </ScrollView>

        <BridgeRecurringBuyFooterView
          onPreviewOrder={handlePreviewOrder}
          isPreviewDisabled={!scheduleValidation.isValid}
        />

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          {...keypadProps}
        >
          {sourceAmount && sourceAmount !== '0' ? (
            <SwapsRecurringBuyConfirmButton
              onPress={handlePreviewOrder}
              label={strings('bridge.recurring.preview_order')}
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
              disabled={!canPreviewOrder}
              loading={isLoading}
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
