import React, { useMemo, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import {
  Box,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import PredictActivity from '../../components/PredictActivity/PredictActivity';
import {
  PredictActivityType,
  PredictPositionStatus,
  type PredictActivityItem,
  type PredictPosition,
} from '../../types';
import { usePredictActivity } from '../../hooks/usePredictActivity';
import { formatCents, formatPrice } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { PredictEventValues } from '../../constants/eventNames';
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { TabEmptyState } from '../../../../../component-library/components-temp/TabEmptyState';
import PredictOffline from '../../components/PredictOffline';
import { PREDICT_TRANSACTIONS_VIEW_TEST_IDS } from './PredictTransactionsView.testIds';
import {
  getPredictPositionsHistoryListSelector,
  PredictPositionsHistoryListSelectorsIDs,
} from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';

interface PredictTransactionsViewProps {
  /**
   * Actionable claimable winnings for the "Claim pending" section.
   * Expected positions are won and have a positive current value; this view
   * filters defensively so non-actionable positions cannot render here.
   */
  claimPendingPositions?: PredictPosition[];
  onClaimPendingPositionsRefresh?: () => Promise<unknown> | void;
  emptyState?: React.ReactNode;
  transactions?: unknown[];
  tabLabel?: string;
  isVisible?: boolean;
  isPrivacyMode?: boolean;
  containerStyle?: string;
  activityContainerStyle?: string;
  shouldTrackActivityViewed?: boolean;
}

interface ActivityHistoryItem {
  activity: PredictActivityItem;
  kind: 'activity';
}

interface ClaimPendingHistoryItem {
  kind: 'claimPending';
  position: PredictPosition;
}

type HistoryItem = ActivityHistoryItem | ClaimPendingHistoryItem;

interface ActivitySection {
  testID?: string;
  title: string;
  data: HistoryItem[];
}

interface ClaimPendingPositionRowProps {
  containerStyle?: string;
  isPrivacyMode: boolean;
  position: PredictPosition;
}

const isActionableClaimPendingPosition = (position: PredictPosition) =>
  position.status === PredictPositionStatus.WON && position.currentValue > 0;

const getClaimPendingPositionTitle = (
  status: PredictPositionStatus,
): string => {
  switch (status) {
    case PredictPositionStatus.LOST:
      return strings('predict.transactions.prediction_lost_title');
    case PredictPositionStatus.WON:
      return strings('predict.transactions.prediction_won_title');
    default:
      return strings('predict.transactions.prediction_resolved_title');
  }
};

const ClaimPendingPositionRow = ({
  containerStyle,
  isPrivacyMode,
  position,
}: ClaimPendingPositionRowProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.MARKET_DETAILS, {
      marketId: position.marketId,
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });
  }, [navigation, position.marketId]);
  const positionTitle = getClaimPendingPositionTitle(position.status);
  const formattedValue = formatPrice(position.currentValue, {
    minimumDecimals: 2,
    maximumDecimals: 2,
  });
  const valueLabel =
    position.currentValue > 0 ? `+${formattedValue}` : formattedValue;
  const accessibilityLabel = strings(
    'predict.transactions.claim_pending_accessibility_label',
    {
      marketTitle: position.title,
      predictionStatus: positionTitle,
    },
  );

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      style={tw.style(
        'flex-row items-start justify-between w-full p-2',
        containerStyle,
      )}
      testID={getPredictPositionsHistoryListSelector.claimPendingRow(
        position.id,
      )}
    >
      <Box twClassName="h-10 w-10 items-center justify-center rounded-full bg-muted mr-3 overflow-hidden mt-1">
        {position.icon ? (
          <Image
            source={{ uri: position.icon }}
            style={tw.style('w-full h-full')}
            accessibilityLabel="claim pending icon"
          />
        ) : null}
      </Box>

      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {positionTitle}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {position.title}
        </Text>
      </Box>

      <Box twClassName="items-end ml-3">
        <SensitiveText
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Medium}
        >
          {valueLabel}
        </SensitiveText>
      </Box>
    </TouchableOpacity>
  );
};

/**
 * Groups activities by individual day (Today, Yesterday, or specific date)
 * Matches Perps date format: "Today", "Yesterday", or "Jan 15"
 * @param timestamp Unix timestamp in seconds
 * @param todayTime Start of today in milliseconds
 * @param yesterdayTime Start of yesterday in milliseconds
 */
const getDateGroupLabel = (
  timestamp: number,
  todayTime: number,
  yesterdayTime: number,
): string => {
  // Convert timestamp from seconds to milliseconds
  const timestampMs = timestamp * 1000;
  const activityDate = new Date(timestampMs);

  // Reset time to start of day for accurate comparison
  activityDate.setHours(0, 0, 0, 0);
  const activityTime = activityDate.getTime();

  if (activityTime === todayTime) {
    return strings('predict.transactions.today');
  } else if (activityTime === yesterdayTime) {
    return strings('predict.transactions.yesterday');
  }

  // Format all other dates as "MMM D" (e.g., "Jan 15") to match Perps
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return formatter.format(activityDate);
};

const PredictTransactionsView: React.FC<PredictTransactionsViewProps> = ({
  claimPendingPositions,
  onClaimPendingPositionsRefresh,
  emptyState,
  isVisible,
  isPrivacyMode = false,
  containerStyle,
  activityContainerStyle,
  shouldTrackActivityViewed = true,
}) => {
  const tw = useTailwind();
  const {
    activity,
    error,
    isLoading,
    isFetching,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchActivity,
  } = usePredictActivity();

  // Track screen load performance (activity data loaded)
  usePredictMeasurement({
    traceName: TraceName.PredictTransactionHistoryView,
    conditions: [!isLoading, activity !== undefined, isVisible === true],
    debugContext: {
      activityCount: activity?.length,
      hasActivity: !!activity,
      isLoading,
    },
  });

  // Track activity list viewed when tab becomes visible
  useEffect(() => {
    if (shouldTrackActivityViewed && isVisible && !isLoading) {
      Engine.context.PredictController.trackActivityViewed({
        activityType: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
      });
    }
  }, [isVisible, isLoading, shouldTrackActivityViewed]);

  const sections: ActivitySection[] = useMemo(() => {
    const sortedClaimPendingPositions = claimPendingPositions
      ? claimPendingPositions
          .filter(isActionableClaimPendingPosition)
          .sort(
            (a, b) =>
              new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
          )
      : [];

    const claimPendingSections: ActivitySection[] =
      sortedClaimPendingPositions.length > 0
        ? [
            {
              title: strings('predict.transactions.claim_pending'),
              testID:
                PredictPositionsHistoryListSelectorsIDs.CLAIM_PENDING_SECTION,
              data: sortedClaimPendingPositions.map((position) => ({
                kind: 'claimPending' as const,
                position,
              })),
            },
          ]
        : [];

    // Cache today and yesterday timestamps for reuse
    const now = Date.now();
    const today = new Date(now);
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const yesterdayTime = yesterday.getTime();

    // Pre-compute date order labels
    const todayLabel = strings('predict.transactions.today');
    const yesterdayLabel = strings('predict.transactions.yesterday');

    // Map and group in a single pass for better performance
    const groupedByDate: Record<string, PredictActivityItem[]> = {};
    const sectionOrder: string[] = [];

    activity.forEach((activityEntry) => {
      const e = activityEntry.entry;

      // Map activity to item
      let item: PredictActivityItem;
      switch (e.type) {
        case 'buy': {
          const amountUsd = e.amount;
          const priceCents = formatCents(e.price ?? 0);
          const outcome = activityEntry.outcome;

          item = {
            id: activityEntry.id,
            type: PredictActivityType.BUY,
            marketTitle: activityEntry.title ?? '',
            detail: strings('predict.transactions.buy_detail', {
              amountUsd,
              outcome,
              priceCents,
            }),
            amountUsd,
            icon: activityEntry.icon,
            outcome,
            providerId: activityEntry.providerId,
            entry: e,
          };
          break;
        }
        case 'sell': {
          const amountUsd = e.amount;
          const priceCents = formatCents(e.price ?? 0);
          item = {
            id: activityEntry.id,
            type: PredictActivityType.SELL,
            marketTitle: activityEntry.title ?? '',
            detail: strings('predict.transactions.sell_detail', {
              priceCents,
            }),
            amountUsd,
            icon: activityEntry.icon,
            outcome: activityEntry.outcome,
            providerId: activityEntry.providerId,
            entry: e,
          };
          break;
        }
        case 'claimWinnings': {
          const amountUsd = e.amount;
          item = {
            id: activityEntry.id,
            type: PredictActivityType.CLAIM,
            marketTitle: activityEntry.title ?? '',
            detail: strings('predict.transactions.claim_detail'),
            amountUsd,
            icon: activityEntry.icon,
            outcome: activityEntry.outcome,
            providerId: activityEntry.providerId,
            entry: e,
          };
          break;
        }
        default: {
          item = {
            id: activityEntry.id,
            type: PredictActivityType.CLAIM,
            marketTitle: activityEntry.title ?? '',
            detail: strings('predict.transactions.claim_detail'),
            amountUsd: 0,
            icon: activityEntry.icon,
            outcome: activityEntry.outcome,
            providerId: activityEntry.providerId,
            entry: e,
          };
          break;
        }
      }

      // Group by date
      const dateLabel = getDateGroupLabel(
        item.entry.timestamp,
        todayTime,
        yesterdayTime,
      );

      if (!groupedByDate[dateLabel]) {
        groupedByDate[dateLabel] = [];
        sectionOrder.push(dateLabel);
      }
      groupedByDate[dateLabel].push(item);
    });

    // Convert to sections array, maintaining chronological order
    const activitySections: ActivitySection[] = [];

    // Add Today first if it exists
    if (groupedByDate[todayLabel]) {
      activitySections.push({
        title: todayLabel,
        data: groupedByDate[todayLabel].map((item) => ({
          activity: item,
          kind: 'activity' as const,
        })),
      });
    }

    // Add Yesterday second if it exists
    if (groupedByDate[yesterdayLabel]) {
      activitySections.push({
        title: yesterdayLabel,
        data: groupedByDate[yesterdayLabel].map((item) => ({
          activity: item,
          kind: 'activity' as const,
        })),
      });
    }

    // Add all other dates in chronological order
    sectionOrder.forEach((label) => {
      if (label !== todayLabel && label !== yesterdayLabel) {
        activitySections.push({
          title: label,
          data: groupedByDate[label].map((item) => ({
            activity: item,
            kind: 'activity' as const,
          })),
        });
      }
    });

    return [...claimPendingSections, ...activitySections];
  }, [activity, claimPendingPositions]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: ActivitySection }) => (
      <Box twClassName="bg-default px-2 pt-3" testID={section.testID}>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-alternative font-semibold"
        >
          {section.title}
        </Text>
      </Box>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      if (item.kind === 'claimPending') {
        return (
          <Box twClassName="py-1">
            <ClaimPendingPositionRow
              containerStyle={activityContainerStyle}
              isPrivacyMode={isPrivacyMode}
              position={item.position}
            />
          </Box>
        );
      }

      return (
        <Box twClassName="py-1">
          <PredictActivity
            item={item.activity}
            containerStyle={activityContainerStyle}
          />
        </Box>
      );
    },
    [activityContainerStyle, isPrivacyMode],
  );

  const keyExtractor = useCallback((item: HistoryItem) => {
    if (item.kind === 'claimPending') {
      return `claim-pending-${item.position.id}`;
    }

    return item.activity.id;
  }, []);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const hasContentSections = sections.length > 0;
  const hasActivityItems = activity.length > 0;
  const shouldShowPartialActivityLoading =
    hasContentSections &&
    !hasActivityItems &&
    (isLoading || (Boolean(error) && isFetching));
  const hasFooterError =
    Boolean(error) && hasContentSections && (!hasActivityItems || hasNextPage);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchActivity(), onClaimPendingPositionsRefresh?.()]);
  }, [onClaimPendingPositionsRefresh, refetchActivity]);

  const handleRetry = useCallback(() => {
    void handleRefresh();
  }, [handleRefresh]);

  const renderFooter = useCallback(() => {
    if (
      isFetchingNextPage ||
      shouldShowPartialActivityLoading ||
      (hasFooterError && isRefetching)
    ) {
      return (
        <Box twClassName="items-center justify-center py-4">
          <ActivityIndicator
            size="small"
            testID={
              PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ACTIVITY_INDICATOR
            }
          />
        </Box>
      );
    }

    if (!hasFooterError) {
      return null;
    }

    return (
      <Box
        twClassName="items-center justify-center gap-2 py-4"
        testID={PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ERROR_STATE}
      >
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {strings('predict.error.description')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleRetry}
          testID={PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_RETRY_BUTTON}
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-primary-default">
            {strings('predict.error.retry')}
          </Text>
        </Pressable>
      </Box>
    );
  }, [
    handleRetry,
    hasFooterError,
    isFetchingNextPage,
    isRefetching,
    shouldShowPartialActivityLoading,
  ]);

  const shouldShowLoadingState =
    (isLoading || (Boolean(error) && isFetching)) && !hasContentSections;
  const shouldShowErrorState = Boolean(error) && !hasContentSections;

  const renderContent = shouldShowLoadingState ? (
    <Box twClassName="items-center justify-center h-full">
      <ActivityIndicator
        size="small"
        testID={PREDICT_TRANSACTIONS_VIEW_TEST_IDS.ACTIVITY_INDICATOR}
      />
    </Box>
  ) : shouldShowErrorState ? (
    <PredictOffline
      onRetry={handleRetry}
      testID={PREDICT_TRANSACTIONS_VIEW_TEST_IDS.ERROR_STATE}
    />
  ) : sections.length === 0 ? (
    (emptyState ?? (
      <Box twClassName="items-center justify-center py-10">
        <TabEmptyState
          description={strings('predict.transactions.no_transactions')}
        />
      </Box>
    ))
  ) : (
    <SectionList<HistoryItem, ActivitySection>
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      contentContainerStyle={tw.style('p-2', containerStyle)}
      showsVerticalScrollIndicator={false}
      style={tw.style('flex-1')}
      stickySectionHeadersEnabled
      refreshing={isRefetching}
      onRefresh={() => {
        void handleRefresh();
      }}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      maxToRenderPerBatch={20}
      initialNumToRender={20}
      windowSize={12}
    />
  );

  return <Box twClassName="flex-1">{renderContent}</Box>;
};

export default PredictTransactionsView;
