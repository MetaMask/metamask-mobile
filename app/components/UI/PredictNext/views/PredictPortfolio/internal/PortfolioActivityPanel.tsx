import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { useActivity } from '../../../hooks/useActivity';
import type { PredictActivityEntry, PredictEntityId } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import { PortfolioActivityRow } from './PortfolioActivityRow';
import { PortfolioEmptyState } from './PortfolioEmptyState';
import { PortfolioPanelError } from './PortfolioPanelError';
import { PortfolioPanelSkeleton } from './PortfolioPanelSkeleton';

interface PortfolioActivityPanelProps {
  query: ReturnType<typeof useActivity>;
  isPrivacyMode: boolean;
  onOpenEvent: (eventId: PredictEntityId, titleSnapshot: string) => void;
  onBrowseMarkets: () => void;
}

/** Renders the independently cached Activity list (Fills and Settlements) for one Venue. */
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
      // Fills and Settlements both navigate through the catalog context.
      const eventId = entry.context?.eventId;
      if (eventId) {
        onOpenEvent(eventId, entry.context?.eventTitle ?? entry.marketId);
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
        keyExtractor={(entry) => entry.id}
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

  return <Box twClassName="flex-1">{content}</Box>;
};
