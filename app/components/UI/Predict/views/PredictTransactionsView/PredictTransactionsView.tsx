import React, { useMemo, useEffect } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
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

  const items: PredictActivityItem[] = useMemo(
    () =>
      activity.map((activityEntry) => {
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
      }),
    [activity],
  );

  return (
    <Box twClassName="flex-1">
      {isLoading ? (
        <Box twClassName="items-center justify-center h-full">
          <ActivityIndicator size="small" testID="activity-indicator" />
        </Box>
      ) : items.length === 0 ? (
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
        <FlatList<PredictActivityItem>
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Box twClassName="py-1">
              <PredictActivity item={item} />
            </Box>
          )}
          contentContainerStyle={tw.style('p-2')}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          style={tw.style('flex-1')}
        />
      )}
    </Box>
  );
};

export default PredictTransactionsView;
