import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FlatList, ListRenderItem, ActivityIndicator } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { usePointsEvents } from '../../../hooks/usePointsEvents';
import { PointsEventDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import { strings } from '../../../../../../../locales/i18n';
import { ActivityEventRow } from './ActivityEventRow';
import {
  selectSeasonId,
  selectSeasonStartDate,
  selectSeasonStatusLoading,
} from '../../../../../../reducers/rewards/selectors';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import MetamaskRewardsActivityEmptyImage from '../../../../../../images/rewards/metamask-rewards-activity-empty.svg';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { setActiveTab } from '../../../../../../actions/rewards';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAccountNames } from '../../../../../hooks/DisplayName/useAccountNames';
import { NameType } from '../../../../Name/Name.types';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';

const LoadingFooter: React.FC = () => (
  <Box twClassName="py-4 items-center">
    <ActivityIndicator size="small" testID="activity-indicator" />
  </Box>
);

const ItemSeparator: React.FC = () => <Box twClassName="h-2" />;

const EmptyState: React.FC = () => {
  const dispatch = useDispatch();
  const tw = useTailwind();

  const handleSeeWaysToEarn = () => {
    dispatch(setActiveTab('overview'));
  };

  return (
    <Box twClassName="flex-1 items-center py-4">
      <MetamaskRewardsActivityEmptyImage
        name="MetamaskRewardsActivityEmptyImage"
        width={80}
        height={80}
        style={tw.style('mb-4')}
      />

      <Box twClassName="items-center gap-2">
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-text-alternative text-center"
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
  const seasonStartDate = useSelector(selectSeasonStartDate);
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
  const accountNameRequests = useMemo(
    () =>
      pointsEvents?.map((event) => ({
        type: NameType.EthereumAddress,
        value: event.accountAddress ?? '',
        variation: '',
      })),
    [pointsEvents],
  );

  const accountNames = useAccountNames(accountNameRequests || []);

  const renderItem: ListRenderItem<PointsEventDto> = ({ item, index }) => (
    <ActivityEventRow
      event={item}
      accountName={accountNames?.[index]}
      testID={`${
        REWARDS_VIEW_SELECTORS.ACTIVITY_ROW
      }-${item.type.toLowerCase()}-${index}`}
    />
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return <LoadingFooter />;
    }
    return <Box twClassName="h-4" />;
  };

  if (
    (isLoading || (seasonStatusLoading && !!seasonStartDate)) &&
    !isRefreshing
  ) {
    return (
      <Skeleton height="100%" width="100%" className="absolute left-0 top-0" />
    );
  } else if (
    !isLoading &&
    !error &&
    pointsEvents &&
    pointsEvents.length === 0
  ) {
    return null;
  }

  if (error && !pointsEvents?.length) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.active_activity_error.error_fetching_title')}
        description={strings(
          'rewards.active_activity_error.error_fetching_description',
        )}
        onConfirm={refresh}
        confirmButtonLabel={strings(
          'rewards.active_activity_error.retry_button',
        )}
      />
    );
  }

  // Determine what to render based on loading state and data
  const shouldShowLoadingSkeleton =
    (isLoading || pointsEvents === null) && !pointsEvents?.length && !error;

  const hasPointsEvents = pointsEvents?.length;

  if (shouldShowLoadingSkeleton) {
    return <Skeleton style={tw.style('h-32 bg-rounded')} />;
  }

  if (hasPointsEvents) {
    return (
      <FlatList
        testID={REWARDS_VIEW_SELECTORS.FLATLIST}
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
      />
    );
  }

  return <EmptyState />;
};
