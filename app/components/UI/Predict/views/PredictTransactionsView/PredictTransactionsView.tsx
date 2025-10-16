import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictActivity, {
  PredictActivityType,
  type PredictActivityItem,
} from '../../components/PredictActivity/PredictActivity';
import { usePredictActivity } from '../../hooks/usePredictActivity';
import { formatCents } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';

interface PredictTransactionsViewProps {
  transactions?: unknown[];
  tabLabel?: string;
}

const PredictTransactionsView: React.FC<PredictTransactionsViewProps> = () => {
  const tw = useTailwind();
  const { activity, isLoading } = usePredictActivity({});

  const items: PredictActivityItem[] = useMemo(
    () =>
      activity.map((entry) => {
        const e = entry.entry;

        switch (e.type) {
          case 'buy': {
            const amountUsd = e.amount;
            const priceCents = formatCents(e.price ?? 0);
            const outcome = entry.outcome;

            return {
              id: entry.id,
              type: PredictActivityType.BUY,
              marketTitle: entry.title,
              detail: strings('predict.transactions.buy_detail', {
                amountUsd,
                outcome,
                priceCents,
              }),
              amountUsd,
              icon: entry.icon,
            } as PredictActivityItem;
          }
          case 'sell': {
            const amountUsd = e.amount;
            const priceCents = formatCents(e.price ?? 0);
            return {
              id: entry.id,
              type: PredictActivityType.SELL,
              marketTitle: entry.title,
              detail: strings('predict.transactions.sell_detail', {
                priceCents,
              }),
              amountUsd,
              icon: entry.icon,
            } as PredictActivityItem;
          }
          case 'claimWinnings': {
            const amountUsd = e.amount;
            return {
              id: entry.id,
              type: PredictActivityType.CLAIM,
              marketTitle: entry.title,
              detail: strings('predict.transactions.claim_detail'),
              amountUsd,
              icon: entry.icon,
            } as PredictActivityItem;
          }
          default: {
            return {
              id: entry.id,
              type: PredictActivityType.CLAIM,
              marketTitle: entry.title,
              detail: strings('predict.transactions.claim_detail'),
              amountUsd: 0,
              icon: entry.icon,
            } as PredictActivityItem;
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
