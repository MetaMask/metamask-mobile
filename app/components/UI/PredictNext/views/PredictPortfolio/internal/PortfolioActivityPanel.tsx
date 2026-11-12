import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
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
import { formatActivityDate } from '../../../utils/portfolioFormatting';

interface PortfolioActivityPanelProps {
  query: ReturnType<typeof useActivity>;
  isPrivacyMode: boolean;
  onOpenEvent: (eventId: PredictEntityId, titleSnapshot: string) => void;
  onBrowseMarkets: () => void;
}

/**
 * Renders the independently cached Activity list in the backend's pinned
 * order, never re-sorted. Archive and explicit demo degradation notices stay
 * visible alongside cached rows. An empty page with a cursor is scan progress:
 * each such continuation requires one explicit user request, not an auto loop.
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
  const settlementsDegraded = data?.pages.some(
    (page) => page.settlementsDegradedReason === 'venue_permission_denied',
  );
  const hasInitialError = isError && entries.length === 0 && !hasNextPage;
  // Empty pages can be scan progress, not exhaustion. Stop scroll-driven
  // pagination at each such page and let the user authorize one more page.
  const needsExplicitContinuation =
    Boolean(hasNextPage) &&
    (data?.pages[data.pages.length - 1]?.activity.length === 0 || isError);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || needsExplicitContinuation) {
      return;
    }

    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, needsExplicitContinuation]);

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
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

  const continuation = needsExplicitContinuation ? (
    <Box
      twClassName="items-center px-8 py-6"
      testID={PredictPortfolioScreenTestIds.ACTIVITY_CONTINUATION}
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-4 text-center"
      >
        {strings(
          isError
            ? 'predict_next.portfolio.load_failed'
            : 'predict_next.portfolio.activity_continue_description',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={handleLoadMore}
        isDisabled={isFetchingNextPage}
        isLoading={isFetchingNextPage}
        testID={PredictPortfolioScreenTestIds.ACTIVITY_LOAD_MORE}
      >
        {strings('predict_next.portfolio.activity_load_more')}
      </Button>
    </Box>
  ) : null;

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
  } else if (entries.length === 0 && hasNextPage) {
    content = continuation;
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
          continuation ??
          (isFetchingNextPage ? (
            <Box
              testID={PredictPortfolioScreenTestIds.ACTIVITY_NEXT_PAGE_LOADING}
              twClassName="items-center py-4"
            >
              <ActivityIndicator />
            </Box>
          ) : null)
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
      {settlementsDegraded && !isPending && !hasInitialError ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="py-2"
          testID={PredictPortfolioScreenTestIds.ACTIVITY_SETTLEMENTS_DEGRADED}
        >
          {strings('predict_next.portfolio.settlements_permission_denied')}
        </Text>
      ) : null}
      {content}
    </Box>
  );
};
