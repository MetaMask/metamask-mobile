import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useParams } from '../../../../../util/navigation/navUtils';
import OpenOrderRow from '../../components/OpenOrderRow';
import { DetailRow } from '../../components/LimitOrderConfirmationModal/DetailRow';
import type { BridgeToken } from '../../types';
import { getTokenImageSource } from '../../utils';
import { showRecurringOrderCanceledToast } from '../../components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.utils';
import { RecurringOrderCancelSheet } from './RecurringOrderCancelSheet';
import {
  getRecurringOrderSwapCounts,
  RECURRING_ORDERS_BY_ID,
} from './RecurringOrderDetailsView.mock';
import { RecurringOrderDetailsViewSelectorsIDs } from './RecurringOrderDetailsView.testIds';
import {
  type RecurringOrderDetailsRouteParams,
  type RecurringSwap,
  RecurringOrderStatus,
  RecurringSwapStatus,
} from './RecurringOrderDetailsView.types';

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

function getSwapAccessory(swap: RecurringSwap) {
  if (swap.status === RecurringSwapStatus.Warning) {
    return (
      <Icon
        name={IconName.Warning}
        color={IconColor.WarningDefault}
        size={IconSize.Sm}
      />
    );
  }

  if (swap.status === RecurringSwapStatus.Failed) {
    return <Tag severity={TagSeverity.Danger}>{swap.statusLabel}</Tag>;
  }

  return <Tag severity={TagSeverity.Success}>{swap.statusLabel}</Tag>;
}

function RecurringOrderDetailsView() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { orderId } = useParams<RecurringOrderDetailsRouteParams>();
  const [isCancelSheetVisible, setIsCancelSheetVisible] = useState(false);
  const order = RECURRING_ORDERS_BY_ID[orderId];

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

  if (!order) {
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
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={RecurringOrderDetailsViewSelectorsIDs.NOT_FOUND}
          >
            {strings('bridge.recurring.order_not_found')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  const { filledSwapCount, filledPercent, totalSwapCount } =
    getRecurringOrderSwapCounts(order);
  const pair = strings('bridge.recurring.pair', {
    source: order.sourceToken.symbol,
    dest: order.destinationToken.symbol,
  });
  const scheduleSummary = strings('bridge.recurring.schedule_summary', {
    interval: order.interval,
    count: totalSwapCount,
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
      >
        <Box gap={6} paddingHorizontal={4} paddingVertical={4}>
          <RecurringTokenSummary
            label={strings('bridge.recurring.you_sent')}
            token={order.sourceToken}
            tokenAvatarTestID={
              RecurringOrderDetailsViewSelectorsIDs.SOURCE_TOKEN_AVATAR
            }
            networkBadgeTestID={
              RecurringOrderDetailsViewSelectorsIDs.SOURCE_NETWORK_BADGE
            }
          />
          <RecurringTokenSummary
            label={strings('bridge.recurring.you_receive')}
            token={order.destinationToken}
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
              {`${order.filledAmount} / ${order.totalSourceAmount} `}
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
              {order.sizePerOrder}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.price_range.label')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {order.priceRange}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.total_received')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {order.totalReceived}
            </Text>
          </DetailRow>
          <DetailRow
            label={strings('bridge.recurring.average_execution_price')}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {order.averageExecutionPrice}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.start_date')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {order.startDate}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.end_date')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {order.endDate}
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
                filledOrderCount: filledSwapCount,
                totalOrderCount: totalSwapCount,
              })}
            </Text>
          </Box>
          <Box gap={3}>
            {order.swaps.map((swap) => {
              const isWarning = swap.status === RecurringSwapStatus.Warning;
              const hasZeroAmounts =
                isWarning || swap.status === RecurringSwapStatus.Failed;

              return (
                <OpenOrderRow
                  key={swap.swapId}
                  token={order.destinationToken}
                  title={pair}
                  subtitle={isWarning ? swap.statusLabel : ''}
                  primaryValue={swap.receivedAmount}
                  secondaryValue={swap.spentAmount}
                  titleColor={
                    isWarning ? TextColor.WarningDefault : TextColor.TextDefault
                  }
                  subtitleColor={
                    isWarning
                      ? TextColor.WarningDefault
                      : TextColor.TextAlternative
                  }
                  primaryColor={
                    hasZeroAmounts
                      ? TextColor.TextAlternative
                      : TextColor.SuccessDefault
                  }
                  titleEndAccessory={getSwapAccessory(swap)}
                  testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(
                    swap.swapId,
                  )}
                />
              );
            })}
          </Box>
        </Box>
      </ScrollView>

      {order.status === RecurringOrderStatus.InProgress ? (
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
