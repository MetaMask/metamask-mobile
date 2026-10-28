import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { useActivity } from '../../../hooks/useActivity';
import type { PredictActivityEntry, PredictEntityId } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import { PortfolioActivityRow } from './PortfolioActivityRow';
import { PortfolioEmptyState } from './PortfolioEmptyState';
import { PortfolioPanelError } from './PortfolioPanelError';
import { PortfolioPanelSkeleton } from './PortfolioPanelSkeleton';
import { formatActivityDate } from './portfolioFormatting';

interface PortfolioActivityPanelProps {
  query: ReturnType<typeof useActivity>;
  isPrivacyMode: boolean;
  onOpenEvent: (eventId: PredictEntityId, titleSnapshot: string) => void;
  onBrowseMarkets: () => void;
}

/**
 * Renders the independently cached Activity list (Trades and Settlements) for
 * one Venue in the backend's pinned order, never re-sorted. When a loaded
 * page reaches the Venue's settlement archive, the list says from when its
 * Settlements are complete instead of presenting a truncated history as
 * whole.
 */
export const PortfolioActivityPanel = ({
  query,
  isPrivacyMode,
  onOpenEvent,
  onBrowseMarkets,
}: PortfolioActivityPanelProps) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = query;
  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.activity) ?? [],
    [data],
  );
  const settlementsCompleteFrom = useMemo(
    () =>
      data?.pages.find((page) => page.settlementsCompleteFrom)
        ?.settlementsCompleteFrom,
    [data],
  );
  const hasInitialError = isError && entries.length === 0;

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const handlePress = useCallback(
    (entry: PredictActivityEntry) => {
      // Trades and Settlements both navigate through the catalog context.
      const { context } = entry;
      if (context) {
        onOpenEvent(context.eventId, context.eventTitle);
      }
    },
    [onOpenEvent],
  );

  const renderItem = useCallback(
    ({ item }: { item: PredictActivityEntry }) => (
      <PortfolioActivityRow
        entry={item}
        isPrivacyMode={isPrivacyMode}
        onPress={item.context?.eventId ? handlePress : undefined}
      />
    ),
    [handlePress, isPrivacyMode],
  );

  let content: React.ReactNode;
  if (isPending) {
    content = (
      <PortfolioPanelSkeleton
        testID={PredictPortfolioScreenTestIds.ACTIVITY_LOADING}
      />
    );
  } else if (hasInitialError) {
    content = (
      <PortfolioPanelError
        onRetry={handleRetry}
        testID={PredictPortfolioScreenTestIds.ACTIVITY_ERROR}
        retryTestID={PredictPortfolioScreenTestIds.ACTIVITY_RETRY}
      />
    );
  } else if (entries.length === 0) {
    content = (
      <PortfolioEmptyState
        title={strings('predict_next.portfolio.activity_empty.title')}
        description={strings(
          'predict_next.portfolio.activity_empty.description',
        )}
        onBrowseMarkets={onBrowseMarkets}
      />
    );
  } else {
    content = (
      <FlatList
        testID={PredictPortfolioScreenTestIds.ACTIVITY_LIST}
        data={entries}
        renderItem={renderItem}
        keyExtractor={(entry) => `${entry.type}:${entry.id}`}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isFetchingNextPage ? (
            <Box
              testID={PredictPortfolioScreenTestIds.ACTIVITY_NEXT_PAGE_LOADING}
              twClassName="items-center py-4"
            >
              <ActivityIndicator />
            </Box>
          ) : null
        }
      />
    );
  }

  return (
    <Box twClassName="flex-1">
      {settlementsCompleteFrom && !isPending && !hasInitialError ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="py-2"
          testID={PredictPortfolioScreenTestIds.ACTIVITY_SETTLEMENTS_HORIZON}
        >
          {strings('predict_next.portfolio.settlements_complete_from', {
            date: formatActivityDate(settlementsCompleteFrom),
          })}
        </Text>
      ) : null}
      {content}
    </Box>
  );
};
