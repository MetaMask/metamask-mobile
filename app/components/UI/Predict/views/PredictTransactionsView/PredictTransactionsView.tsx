import React, { useMemo, useEffect, useCallback } from 'react';
import { ActivityIndicator, SectionList } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictActivity from '../../components/PredictActivity/PredictActivity';
import { PredictActivityType, type PredictActivityItem } from '../../types';
import { usePredictActivity } from '../../hooks/usePredictActivity';
import { formatCents } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { PredictEventValues } from '../../constants/eventNames';
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { TabEmptyState } from '../../../../../component-library/components-temp/TabEmptyState';
interface PredictTransactionsViewProps {
  transactions?: unknown[];
  tabLabel?: string;
  isVisible?: boolean;
}

interface ActivitySection {
  title: string;
  data: PredictActivityItem[];
}

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
  isVisible,
}) => {
  const tw = useTailwind();
  const { activity, isLoading } = usePredictActivity({});

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
    if (isVisible && !isLoading) {
      Engine.context.PredictController.trackActivityViewed({
        activityType: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
      });
    }
  }, [isVisible, isLoading]);

  const sections: ActivitySection[] = useMemo(() => {
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
        data: groupedByDate[todayLabel],
      });
    }

    // Add Yesterday second if it exists
    if (groupedByDate[yesterdayLabel]) {
      activitySections.push({
        title: yesterdayLabel,
        data: groupedByDate[yesterdayLabel],
      });
    }

    // Add all other dates in chronological order
    sectionOrder.forEach((label) => {
      if (label !== todayLabel && label !== yesterdayLabel) {
        activitySections.push({ title: label, data: groupedByDate[label] });
      }
    });

    return activitySections;
  }, [activity]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: ActivitySection }) => (
      <Box twClassName="bg-default px-2 pt-3">
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
    ({ item }: { item: PredictActivityItem }) => (
      <Box twClassName="py-1">
        <PredictActivity item={item} />
      </Box>
    ),
    [],
  );

  const keyExtractor = useCallback((item: PredictActivityItem) => item.id, []);

  return (
    <Box twClassName="flex-1">
      {isLoading ? (
        <Box twClassName="items-center justify-center h-full">
          <ActivityIndicator size="small" testID="activity-indicator" />
        </Box>
      ) : sections.length === 0 ? (
        <Box twClassName="items-center justify-center py-10">
          <TabEmptyState
            description={strings('predict.transactions.no_transactions')}
          />
        </Box>
      ) : (
        // TODO: Improve loading state, pagination, consider FlashList for better performance, pull down to refresh, etc.
        <SectionList<PredictActivityItem, ActivitySection>
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={tw.style('p-2')}
          showsVerticalScrollIndicator={false}
          style={tw.style('flex-1')}
          stickySectionHeadersEnabled
          removeClippedSubviews
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
        />
      )}
    </Box>
  );
};

export default PredictTransactionsView;
