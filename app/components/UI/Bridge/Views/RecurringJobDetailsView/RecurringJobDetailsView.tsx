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
import { RecurringJobCancelOrderSheet } from './RecurringJobCancelOrderSheet';
import {
  getRecurringJobOrderCounts,
  RECURRING_JOBS_BY_ID,
} from './RecurringJobDetailsView.mock';
import { RecurringJobDetailsViewSelectorsIDs } from './RecurringJobDetailsView.testIds';
import {
  type RecurringJobDetailsRouteParams,
  type RecurringOrder,
  RecurringJobStatus,
  RecurringOrderStatus,
} from './RecurringJobDetailsView.types';

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

function getOrderAccessory(order: RecurringOrder) {
  if (order.status === RecurringOrderStatus.Warning) {
    return (
      <Icon
        name={IconName.Warning}
        color={IconColor.WarningDefault}
        size={IconSize.Sm}
      />
    );
  }

  if (order.status === RecurringOrderStatus.Failed) {
    return <Tag severity={TagSeverity.Danger}>{order.statusLabel}</Tag>;
  }

  return <Tag severity={TagSeverity.Success}>{order.statusLabel}</Tag>;
}

function RecurringJobDetailsView() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { jobId } = useParams<RecurringJobDetailsRouteParams>();
  const [isCancelSheetVisible, setIsCancelSheetVisible] = useState(false);
  const job = RECURRING_JOBS_BY_ID[jobId];

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenCancelSheet = useCallback(() => {
    setIsCancelSheetVisible(true);
  }, []);

  const handleCloseCancelSheet = useCallback(() => {
    setIsCancelSheetVisible(false);
  }, []);

  const handleDuplicateOrder = useCallback(() => undefined, []);

  if (!job) {
    return (
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={tw.style('flex-1 bg-default')}
        testID={RecurringJobDetailsViewSelectorsIDs.SCREEN}
      >
        <HeaderStandard
          title={strings('bridge.tabs.recurring')}
          includesTopInset
          onBack={handleBack}
          backButtonProps={{
            testID: RecurringJobDetailsViewSelectorsIDs.BACK_BUTTON,
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
            testID={RecurringJobDetailsViewSelectorsIDs.NOT_FOUND}
          >
            {strings('bridge.recurring.order_not_found')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  const { filledOrderCount, filledPercent, totalOrderCount } =
    getRecurringJobOrderCounts(job);
  const pair = strings('bridge.recurring.pair', {
    source: job.sourceToken.symbol,
    dest: job.destinationToken.symbol,
  });
  const scheduleSummary = strings('bridge.recurring.schedule_summary', {
    interval: job.interval,
    count: totalOrderCount,
  });

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={RecurringJobDetailsViewSelectorsIDs.SCREEN}
    >
      <HeaderStandard
        title={strings('bridge.tabs.recurring')}
        includesTopInset
        onBack={handleBack}
        backButtonProps={{
          testID: RecurringJobDetailsViewSelectorsIDs.BACK_BUTTON,
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
            token={job.sourceToken}
            tokenAvatarTestID={
              RecurringJobDetailsViewSelectorsIDs.SOURCE_TOKEN_AVATAR
            }
            networkBadgeTestID={
              RecurringJobDetailsViewSelectorsIDs.SOURCE_NETWORK_BADGE
            }
          />
          <RecurringTokenSummary
            label={strings('bridge.recurring.you_receive')}
            token={job.destinationToken}
            tokenAvatarTestID={
              RecurringJobDetailsViewSelectorsIDs.DESTINATION_TOKEN_AVATAR
            }
            networkBadgeTestID={
              RecurringJobDetailsViewSelectorsIDs.DESTINATION_NETWORK_BADGE
            }
          />
        </Box>

        <Box twClassName="mx-4 border-t-[1px] border-muted" />

        <Box
          paddingVertical={3}
          testID={RecurringJobDetailsViewSelectorsIDs.SUMMARY}
        >
          <DetailRow label={strings('bridge.recurring.filled')}>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-right"
              testID={RecurringJobDetailsViewSelectorsIDs.FILLED_VALUE}
            >
              {`${job.filledAmount} / ${job.totalSourceAmount} `}
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
              {job.sizePerOrder}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.price_range.label')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {job.priceRange}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.total_received')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {job.totalReceived}
            </Text>
          </DetailRow>
          <DetailRow
            label={strings('bridge.recurring.average_execution_price')}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {job.averageExecutionPrice}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.start_date')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {job.startDate}
            </Text>
          </DetailRow>
          <DetailRow label={strings('bridge.recurring.end_date')}>
            <Text variant={TextVariant.BodyMd} twClassName="text-right">
              {job.endDate}
            </Text>
          </DetailRow>
        </Box>

        <Box twClassName="mx-4 border-t-[1px] border-muted" />

        <Box
          paddingHorizontal={4}
          paddingTop={4}
          gap={5}
          testID={RecurringJobDetailsViewSelectorsIDs.HISTORY}
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
                filledOrderCount,
                totalOrderCount,
              })}
            </Text>
          </Box>
          <Box gap={3}>
            {job.orders.map((order) => {
              const isWarning = order.status === RecurringOrderStatus.Warning;
              const hasZeroAmounts =
                isWarning || order.status === RecurringOrderStatus.Failed;

              return (
                <OpenOrderRow
                  key={order.orderId}
                  token={job.destinationToken}
                  title={pair}
                  subtitle={isWarning ? order.statusLabel : ''}
                  primaryValue={order.receivedAmount}
                  secondaryValue={order.spentAmount}
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
                  titleEndAccessory={getOrderAccessory(order)}
                  testID={RecurringJobDetailsViewSelectorsIDs.HISTORY_ROW(
                    order.orderId,
                  )}
                />
              );
            })}
          </Box>
        </Box>
      </ScrollView>

      {job.status === RecurringJobStatus.InProgress ? (
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isDanger
            isFullWidth
            onPress={handleOpenCancelSheet}
            testID={RecurringJobDetailsViewSelectorsIDs.CANCEL_BUTTON}
          >
            {strings('bridge.recurring.cancel_order')}
          </Button>
        </Box>
      ) : null}

      {job.status === RecurringJobStatus.Completed ? (
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleDuplicateOrder}
            testID={RecurringJobDetailsViewSelectorsIDs.DUPLICATE_BUTTON}
          >
            {strings('bridge.recurring.duplicate_order')}
          </Button>
        </Box>
      ) : null}

      <RecurringJobCancelOrderSheet
        isVisible={isCancelSheetVisible}
        onClose={handleCloseCancelSheet}
        onConfirm={handleCloseCancelSheet}
      />
    </SafeAreaView>
  );
}

export default RecurringJobDetailsView;
