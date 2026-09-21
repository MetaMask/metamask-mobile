import React, { useCallback, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import { parseCaipAssetType } from '@metamask/utils';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useParams } from '../../../../../util/navigation/navUtils';
import { DetailRow } from '../../components/LimitOrderConfirmationModal/DetailRow';
import type { BridgeToken } from '../../types';
import { getTokenImageSource } from '../../utils';
import { showRecurringOrderCanceledToast } from '../../components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.utils';
import { RecurringOrderStatus } from '../../api/recurringOrders.types';
import { useRecurringSwaps } from '../../hooks/useRecurringSwaps';
import {
  formatRecurringExecutionPrice,
  formatRecurringInterval,
  formatRecurringOrderDate,
  formatRecurringPriceRange,
  formatRecurringTokenAmount,
  getRecurringOrderFilledPercent,
  getRecurringOrderTokens,
  getUsdToCurrentCurrencyRate,
} from '../../utils/recurringOrders';
import { RecurringOrderCancelSheet } from './RecurringOrderCancelSheet';
import { RecurringOrderDetailsViewSelectorsIDs } from './RecurringOrderDetailsView.testIds';
import { type RecurringOrderDetailsRouteParams } from './RecurringOrderDetailsView.types';
import { RecurringSwapRow } from './RecurringSwapRow';

const LOAD_MORE_SCROLL_THRESHOLD = 100;

interface RecurringTokenSummaryProps {
  label: string;
  token: BridgeToken;
  tokenAvatarTestID: string;
  networkBadgeTestID: string;
}

function RecurringTokenSummary({
  label,
  token,
  tokenAvatarTestID,
  networkBadgeTestID,
}: RecurringTokenSummaryProps) {
  const tokenImageSource = getTokenImageSource(
    token.symbol,
    token.image,
    token.address,
    token.chainId,
  );
  const networkImageSource = getNetworkImageSource({
    chainId: token.chainId,
  });

  return (
    <Box gap={2}>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            <BadgeNetwork
              src={networkImageSource}
              twClassName="rounded-md"
              testID={networkBadgeTestID}
            />
          }
        >
          <AvatarToken
            name={token.symbol}
            src={tokenImageSource}
            size={AvatarTokenSize.Lg}
            testID={tokenAvatarTestID}
          />
        </BadgeWrapper>
        <Text variant={TextVariant.HeadingLg}>{token.symbol}</Text>
      </Box>
    </Box>
  );
}

function RecurringOrderDetailsView() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<RecurringOrderDetailsRouteParams>();
  const [isCancelSheetVisible, setIsCancelSheetVisible] = useState(false);
  const currentCurrency = useSelector(selectCurrentCurrency) ?? 'USD';
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const swapsQuery = useRecurringSwaps({ orderId: order.orderId });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenCancelSheet = useCallback(() => {
    setIsCancelSheetVisible(true);
  }, []);

  const handleCloseCancelSheet = useCallback(() => {
    setIsCancelSheetVisible(false);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    showRecurringOrderCanceledToast();
    setIsCancelSheetVisible(false);
  }, []);

  const handleDuplicateOrder = useCallback(() => undefined, []);

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const distanceFromBottom =
        nativeEvent.contentSize.height -
        nativeEvent.layoutMeasurement.height -
        nativeEvent.contentOffset.y;

      if (distanceFromBottom <= LOAD_MORE_SCROLL_THRESHOLD) {
        swapsQuery.fetchNextPage();
      }
    },
    [swapsQuery],
  );

  const { sourceToken, destinationToken } = getRecurringOrderTokens(order);
  const filledPercent = getRecurringOrderFilledPercent(order);
  const filledAmount = formatRecurringTokenAmount(
    order.srcFilled.amount,
    order.src.asset.decimals,
  );
  const totalSourceAmount = formatRecurringTokenAmount(
    order.srcTotal.amount,
    order.src.asset.decimals,
  );
  const sizePerOrder = formatRecurringTokenAmount(
    order.src.amount,
    order.src.asset.decimals,
  );
  const totalReceived = formatRecurringTokenAmount(
    order.destFilled.amount,
    order.dest.asset.decimals,
  );
  const interval = formatRecurringInterval(order.schedule);
  const scheduleSummary = strings('bridge.recurring.schedule_summary', {
    interval,
    count: order.schedule.repeatCount,
  });
  const sourceChainId = formatChainIdToHex(
    parseCaipAssetType(order.src.asset.assetId).chainId,
  );
  const nativeCurrency = networkConfigurations[sourceChainId]?.nativeCurrency;
  const currencyRate = nativeCurrency
    ? currencyRates?.[nativeCurrency]
    : undefined;
  const usdToCurrentCurrencyRate = getUsdToCurrentCurrencyRate({
    currentCurrency,
    conversionRate: currencyRate?.conversionRate,
    usdConversionRate: currencyRate?.usdConversionRate,
  });
  const priceRange = formatRecurringPriceRange({
    priceRange: order.priceRange,
  });
  const averageExecutionPrice = formatRecurringExecutionPrice({
    priceUsd: order.averageExecutionPriceUsd,
    currentCurrency,
    usdToCurrentCurrencyRate,
  });

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={RecurringOrderDetailsViewSelectorsIDs.SCREEN}
    >
      <HeaderStandard
        title={strings('bridge.tabs.recurring')}
        includesTopInset
        onBack={handleBack}
        backButtonProps={{
          testID: RecurringOrderDetailsViewSelectorsIDs.BACK_BUTTON,
        }}
      />
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('pb-6')}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Box gap={6} paddingHorizontal={4} paddingVertical={4}>
          <RecurringTokenSummary
            label={strings('bridge.recurring.you_sent')}
            token={sourceToken}
            tokenAvatarTestID={
              RecurringOrderDetailsViewSelectorsIDs.SOURCE_TOKEN_AVATAR
            }
            networkBadgeTestID={
              RecurringOrderDetailsViewSelectorsIDs.SOURCE_NETWORK_BADGE
            }
          />
          <RecurringTokenSummary
            label={strings('bridge.recurring.you_receive')}
            token={destinationToken}
            tokenAvatarTestID={
              RecurringOrderDetailsViewSelectorsIDs.DESTINATION_TOKEN_AVATAR
            }
            networkBadgeTestID={
              RecurringOrderDetailsViewSelectorsIDs.DESTINATION_NETWORK_BADGE
            }
          />
        </Box>

        <Box twClassName="mx-4 border-t-[1px] border-muted" />

        <Box
          gap={2}
          paddingTop={2}
          paddingBottom={2}
          testID={RecurringOrderDetailsViewSelectorsIDs.SUMMARY}
        >
          <DetailRow label={strings('bridge.recurring.filled')}>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-right"
              testID={RecurringOrderDetailsViewSelectorsIDs.FILLED_VALUE}
            >
              {`${filledAmount} / ${totalSourceAmount} ${sourceToken.symbol} `}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                (
                {strings('bridge.recurring.filled_progress', {
                  percent: filledPercent,
                })}
                )
              </Text>
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.interval')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {scheduleSummary}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.size_per_order')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {`${sizePerOrder} ${sourceToken.symbol}`}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.price_range.label')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {priceRange}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.total_received')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {`${totalReceived} ${destinationToken.symbol}`}
            </Text>
          </DetailRow>
          <DetailRow
            label={strings('bridge.recurring.average_execution_price')}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {averageExecutionPrice}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.start_date')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {formatRecurringOrderDate(order.startsAt)}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.end_date')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {formatRecurringOrderDate(order.endsAt)}
            </Text>
          </DetailRow>
        </Box>

        <Box twClassName="mx-4 border-t-[1px] border-muted" />

        <Box
          paddingHorizontal={4}
          paddingTop={4}
          gap={5}
          testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('bridge.recurring.history')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('bridge.recurring.history_progress', {
                filledOrderCount: order.filledSwapsCount,
                totalOrderCount: order.schedule.repeatCount,
              })}
            </Text>
          </Box>

          {swapsQuery.isLoading && swapsQuery.swaps.length === 0 ? (
            <Box alignItems={BoxAlignItems.Center} paddingVertical={6}>
              <Spinner
                testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY_LOADING}
                spinnerIconProps={{ size: IconSize.Lg }}
              />
            </Box>
          ) : null}

          {swapsQuery.isError && swapsQuery.swaps.length === 0 ? (
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              gap={3}
              paddingVertical={4}
              testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY_ERROR}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('bridge.recurring.history_error')}
              </Text>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={() => swapsQuery.refetch()}
                testID={
                  RecurringOrderDetailsViewSelectorsIDs.HISTORY_RETRY_BUTTON
                }
              >
                {strings('bridge.orders.try_again')}
              </Button>
            </Box>
          ) : null}

          {!swapsQuery.isLoading &&
          !swapsQuery.isError &&
          swapsQuery.swaps.length === 0 ? (
            <Box
              alignItems={BoxAlignItems.Center}
              paddingVertical={4}
              testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY_EMPTY}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('bridge.recurring.history_empty')}
              </Text>
            </Box>
          ) : null}

          {swapsQuery.swaps.length > 0 ? (
            <Box gap={3}>
              {swapsQuery.swaps.map((swap) => (
                <RecurringSwapRow
                  key={swap.swapId}
                  swap={swap}
                  sourceToken={sourceToken}
                  destinationToken={destinationToken}
                />
              ))}
            </Box>
          ) : null}

          {swapsQuery.isFetchingNextPage ? (
            <Box alignItems={BoxAlignItems.Center} paddingVertical={4}>
              <Spinner
                testID={
                  RecurringOrderDetailsViewSelectorsIDs.HISTORY_NEXT_PAGE_LOADING
                }
                spinnerIconProps={{ size: IconSize.Md }}
              />
            </Box>
          ) : null}
        </Box>
      </ScrollView>

      {order.status === RecurringOrderStatus.Open ? (
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isDanger
            isFullWidth
            onPress={handleOpenCancelSheet}
            testID={RecurringOrderDetailsViewSelectorsIDs.CANCEL_BUTTON}
          >
            {strings('bridge.recurring.cancel_order')}
          </Button>
        </Box>
      ) : null}

      {order.status === RecurringOrderStatus.Completed ? (
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleDuplicateOrder}
            testID={RecurringOrderDetailsViewSelectorsIDs.DUPLICATE_BUTTON}
          >
            {strings('bridge.recurring.duplicate_order')}
          </Button>
        </Box>
      ) : null}

      <RecurringOrderCancelSheet
        isVisible={isCancelSheetVisible}
        onClose={handleCloseCancelSheet}
        onConfirm={handleConfirmCancel}
      />
    </SafeAreaView>
  );
}

export default RecurringOrderDetailsView;
