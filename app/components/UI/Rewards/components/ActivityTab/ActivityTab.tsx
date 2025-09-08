import React from 'react';
import { useSelector } from 'react-redux';
import { FlatList, ListRenderItem, ActivityIndicator } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  Icon,
  IconSize,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { usePointsEvents } from '../../hooks/usePointsEvents';
import { PointsEventDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { useSeasonStatus } from '../../hooks/useSeasonStatus';
import { formatRewardsDate, getEventDetails } from '../../utils/formatUtils';

const ActivityEventRow: React.FC<{ event: PointsEventDto }> = ({ event }) => {
  const eventDetails = getEventDetails(event);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full"
      gap={3}
    >
      <Box
        twClassName="bg-muted rounded-full items-center justify-center size-12"
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Icon name={eventDetails.icon} size={IconSize.Lg} />
      </Box>
      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Start}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text>{eventDetails.title}</Text>
          <Box flexDirection={BoxFlexDirection.Row} gap={1}>
            <Text>{`+${event.value}`}</Text>
            {event.bonus?.bips && (
              <Text twClassName="text-muted">{`(+${
                event.bonus?.bips / 100
              }% bonus)`}</Text>
            )}
          </Box>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            {eventDetails.details}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            {formatRewardsDate(event.timestamp.getTime())}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

const LoadingFooter: React.FC = () => (
  <Box twClassName="py-4 items-center">
    <ActivityIndicator size="small" />
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
    return <EmptyState message="Loading activity..." />;
  }

  if (error) {
    return <EmptyState message={`Error loading activity: ${error}`} isError />;
  }

  if (pointsEvents.length === 0) {
    return <EmptyState message="No activity found" />;
  }

  return (
    <FlatList
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
