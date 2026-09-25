import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { usePositions } from '../../../hooks/usePositions';
import type { PredictEntityId, PredictPosition } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import { PortfolioEmptyState } from './PortfolioEmptyState';
import { PortfolioPanelError } from './PortfolioPanelError';
import { PortfolioPanelSkeleton } from './PortfolioPanelSkeleton';
import { PortfolioPositionRow } from './PortfolioPositionRow';

interface PortfolioPositionsPanelProps {
  query: ReturnType<typeof usePositions>;
  isPrivacyMode: boolean;
  onOpenEvent: (eventId: PredictEntityId, titleSnapshot: string) => void;
  onBrowseMarkets: () => void;
}

/** Renders the independently cached open Positions list for one Venue. */
export const PortfolioPositionsPanel = ({
  query,
  isPrivacyMode,
  onOpenEvent,
  onBrowseMarkets,
}: PortfolioPositionsPanelProps) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = query;
  const positions = useMemo(
    () => data?.pages.flatMap((page) => page.positions) ?? [],
    [data],
  );
  const hasInitialError = isError && positions.length === 0;

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
    (position: PredictPosition) => {
      if (position.context?.eventId) {
        onOpenEvent(position.context.eventId, position.context.eventTitle);
      }
    },
    [onOpenEvent],
  );

  const renderItem = useCallback(
    ({ item }: { item: PredictPosition }) => (
      <PortfolioPositionRow
        position={item}
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
        testID={PredictPortfolioScreenTestIds.POSITIONS_LOADING}
      />
    );
  } else if (hasInitialError) {
    content = (
      <PortfolioPanelError
        onRetry={handleRetry}
        testID={PredictPortfolioScreenTestIds.POSITIONS_ERROR}
        retryTestID={PredictPortfolioScreenTestIds.POSITIONS_RETRY}
      />
    );
  } else if (positions.length === 0) {
    content = (
      <PortfolioEmptyState
        title={strings('predict_next.portfolio.empty.title')}
        description={strings('predict_next.portfolio.empty.description')}
        onBrowseMarkets={onBrowseMarkets}
      />
    );
  } else {
    content = (
      <FlatList
        testID={PredictPortfolioScreenTestIds.POSITIONS_LIST}
        data={positions}
        renderItem={renderItem}
        keyExtractor={(position) => `${position.marketId}-${position.side}`}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isFetchingNextPage ? (
            <Box
              testID={PredictPortfolioScreenTestIds.POSITIONS_NEXT_PAGE_LOADING}
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
