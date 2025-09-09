import React from 'react';
import { useSelector } from 'react-redux';
import { FlatList, ListRenderItem, ActivityIndicator } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { usePointsEvents } from '../../hooks/usePointsEvents';
import { PointsEventDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { useSeasonStatus } from '../../hooks/useSeasonStatus';
import { strings } from '../../../../../../locales/i18n';
import { ActivityEventRow } from './ActivityEventRow';

const LoadingFooter: React.FC = () => (
  <Box twClassName="py-4 items-center">
    <ActivityIndicator size="small" testID="activity-indicator" />
  </Box>
);

const ItemSeparator: React.FC = () => <Box twClassName="h-4" />;

const EmptyState: React.FC<{ message: string; isError?: boolean }> = ({
  message,
  isError = false,
}) => (
  <Box twClassName="flex-1 items-center justify-center">
    <Text
      variant={TextVariant.BodyMd}
      twClassName={isError ? 'text-error' : 'text-muted'}
    >
      {message}
    </Text>
  </Box>
);

export const ActivityTab: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const { seasonStatus } = useSeasonStatus({
    subscriptionId: subscriptionId ?? undefined,
    seasonId: 'current',
  });

  // For now, using hardcoded seasonId - this should be obtained from the current season
  const {
    pointsEvents,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  } = usePointsEvents({
    seasonId: seasonStatus?.season.id,
    subscriptionId: subscriptionId || '',
  });

  const renderItem: ListRenderItem<PointsEventDto> = ({ item }) => (
    <ActivityEventRow event={item} />
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return <LoadingFooter />;
    }
    return null;
  };

  if (isLoading && !isRefreshing) {
    return <EmptyState message={strings('rewards.loading_activity')} />;
  }

  if (error) {
    return (
      <EmptyState
        message={`${strings('rewards.error_loading_activity')}: ${error}`}
        isError
      />
    );
  }

  return (
    <FlatList
      testID="flatlist"
      data={pointsEvents}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ItemSeparatorComponent={ItemSeparator}
      onRefresh={refresh}
      refreshing={isRefreshing}
    />
  );
};
