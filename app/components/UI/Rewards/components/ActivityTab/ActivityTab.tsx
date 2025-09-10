import React from 'react';
import { useSelector } from 'react-redux';
import { FlatList, ListRenderItem, ActivityIndicator } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { usePointsEvents } from '../../hooks/usePointsEvents';
import { PointsEventDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';
import { ActivityEventRow } from './ActivityEventRow';
import { selectSeasonId } from '../../../../../reducers/rewards/selectors';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

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
  <Box twClassName="flex-1 items-center justify-cente relative">
    {!isError && (
      <Skeleton height="100%" width="100%" className="absolute left-0 top-0" />
    )}

    <Text
      variant={TextVariant.BodyMd}
      twClassName={isError ? 'text-error z-10' : 'text-muted z-10'}
    >
      {message}
    </Text>
  </Box>
);

export const ActivityTab: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const seasonId = useSelector(selectSeasonId);
  const {
    pointsEvents,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  } = usePointsEvents({
    seasonId: seasonId ?? undefined,
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
