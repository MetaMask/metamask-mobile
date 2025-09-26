import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FlatList, ListRenderItem, ActivityIndicator } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { usePointsEvents } from '../../hooks/usePointsEvents';
import { PointsEventDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';
import { ActivityEventRow } from './ActivityEventRow';
import {
  selectSeasonId,
  selectSeasonStatusLoading,
} from '../../../../../reducers/rewards/selectors';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import MetamaskRewardsActivityEmptyImage from '../../../../../images/metamask-rewards-activity-empty.svg';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { setActiveTab } from '../../../../../actions/rewards';

const LoadingFooter: React.FC = () => (
  <Box twClassName="py-4 items-center">
    <ActivityIndicator size="small" testID="activity-indicator" />
  </Box>
);

const ItemSeparator: React.FC = () => <Box twClassName="h-6" />;

const IntermediateState: React.FC<{ message?: string; isError?: boolean }> = ({
  message,
  isError = false,
}) => (
  <Box twClassName="flex-1 items-center justify-center relative mt-4">
    {!isError && (
      <Skeleton height="100%" width="100%" className="absolute left-0 top-0" />
    )}

    {isError && (
      <BannerAlert severity={BannerAlertSeverity.Error} description={message} />
    )}
  </Box>
);

const EmptyState: React.FC = () => {
  const dispatch = useDispatch();

  const handleSeeWaysToEarn = () => {
    dispatch(setActiveTab('overview'));
  };

  return (
    <Box twClassName="flex-1 items-center p-20 gap-8">
      <MetamaskRewardsActivityEmptyImage
        name="MetamaskRewardsActivityEmptyImage"
        width={120}
        height={120}
      />

      <Box twClassName="items-center gap-2">
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-alternative text-center"
        >
          {strings('rewards.activity_empty_title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-alternative text-center"
        >
          {strings('rewards.activity_empty_description')}
        </Text>

        <Button variant={ButtonVariant.Tertiary} onPress={handleSeeWaysToEarn}>
          {strings('rewards.activity_empty_link')}
        </Button>
      </Box>
    </Box>
  );
};

export const ActivityTab: React.FC = () => {
  const tw = useTailwind();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const seasonId = useSelector(selectSeasonId);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
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

  if ((isLoading || seasonStatusLoading) && !isRefreshing) {
    return <IntermediateState />;
  }

  if (error) {
    return (
      <IntermediateState
        message={`${strings('rewards.error_loading_activity')}: ${error}`}
        isError
      />
    );
  }

  if (pointsEvents.length === 0) {
    return <EmptyState />;
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
      horizontal={false}
      style={tw.style('mt-6')}
    />
  );
};
