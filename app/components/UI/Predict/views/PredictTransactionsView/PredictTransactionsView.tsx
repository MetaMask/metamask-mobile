import React, { useMemo, useEffect } from 'react';
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
 * @param timestamp Unix timestamp in seconds
 */
const getDateGroupLabel = (timestamp: number): string => {
  // Convert timestamp from seconds to milliseconds
  const timestampMs = timestamp * 1000;
  const now = Date.now();
  const activityDate = new Date(timestampMs);
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);

  // Reset time to start of day for accurate comparison
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  activityDate.setHours(0, 0, 0, 0);

  const activityTime = activityDate.getTime();
  const todayTime = today.getTime();
  const yesterdayTime = yesterday.getTime();

  if (activityTime === todayTime) {
    return strings('predict.transactions.today');
  } else if (activityTime === yesterdayTime) {
    return strings('predict.transactions.yesterday');
  }

  // Format all other dates as "MMM D, YYYY" (e.g., "Oct 5, 2025")
  return activityDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const PredictTransactionsView: React.FC<PredictTransactionsViewProps> = ({
  isVisible,
}) => {
  const tw = useTailwind();
  const { activity, isLoading } = usePredictActivity({});

  // Track activity list viewed when tab becomes visible
  useEffect(() => {
    if (isVisible && !isLoading) {
      Engine.context.PredictController.trackActivityViewed({
        activityType: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
      });
    }
  }, [isVisible, isLoading]);

  const sections: ActivitySection[] = useMemo(() => {
    // First, map activities to items
    const items: PredictActivityItem[] = activity.map((activityEntry) => {
      const e = activityEntry.entry;

      switch (e.type) {
        case 'buy': {
          const amountUsd = e.amount;
          const priceCents = formatCents(e.price ?? 0);
          const outcome = activityEntry.outcome;

          return {
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
        }
        case 'sell': {
          const amountUsd = e.amount;
          const priceCents = formatCents(e.price ?? 0);
          return {
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
        }
        case 'claimWinnings': {
          const amountUsd = e.amount;
          return {
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
        }
        default: {
          return {
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
        }
      }
    });

    // Sort items by timestamp (newest first)
    const sortedItems = [...items].sort(
      (a, b) => b.entry.timestamp - a.entry.timestamp,
    );

    // Group items by date
    const groupedByDate = sortedItems.reduce<
      Record<string, PredictActivityItem[]>
    >((acc, item) => {
      const dateLabel = getDateGroupLabel(item.entry.timestamp);
      if (!acc[dateLabel]) {
        acc[dateLabel] = [];
      }
      acc[dateLabel].push(item);
      return acc;
    }, {});

    // Convert to sections array, maintaining chronological order
    const dateOrder = [
      strings('predict.transactions.today'),
      strings('predict.transactions.yesterday'),
    ];

    const orderedSections: ActivitySection[] = [];
    const dateSections: ActivitySection[] = [];

    Object.entries(groupedByDate).forEach(([title, data]) => {
      const section = { title, data };
      const orderIndex = dateOrder.indexOf(title);

      if (orderIndex !== -1) {
        // Today or Yesterday
        orderedSections[orderIndex] = section;
      } else {
        // Specific dates
        dateSections.push(section);
      }
    });

    // Sort date sections by the first item's timestamp (newest first)
    dateSections.sort((a, b) => {
      const aTimestamp = a.data[0]?.entry.timestamp ?? 0;
      const bTimestamp = b.data[0]?.entry.timestamp ?? 0;
      return bTimestamp - aTimestamp;
    });

    return [...orderedSections.filter(Boolean), ...dateSections];
  }, [activity]);

  const renderSectionHeader = ({ section }: { section: ActivitySection }) => (
    <Box twClassName="bg-default px-4 py-2">
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-alternative font-medium"
      >
        {section.title}
      </Text>
    </Box>
  );

  return (
    <Box twClassName="flex-1">
      {isLoading ? (
        <Box twClassName="items-center justify-center h-full">
          <ActivityIndicator size="small" testID="activity-indicator" />
        </Box>
      ) : sections.length === 0 ? (
        <Box twClassName="px-4">
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative py-2"
          >
            {strings('predict.transactions.no_transactions')}
          </Text>
        </Box>
      ) : (
        // TODO: Improve loading state, pagination, consider FlashList for better performance, pull down to refresh, etc.
        <SectionList<PredictActivityItem, ActivitySection>
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Box twClassName="py-1">
              <PredictActivity item={item} />
            </Box>
          )}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={tw.style('p-2')}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          style={tw.style('flex-1')}
          stickySectionHeadersEnabled={false}
        />
      )}
    </Box>
  );
};

export default PredictTransactionsView;
