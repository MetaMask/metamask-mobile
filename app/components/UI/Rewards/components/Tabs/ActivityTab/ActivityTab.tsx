import React, { useMemo, useState, useCallback } from 'react';
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
import {
  PointsEventDto,
  PointsEventEarnType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import { strings } from '../../../../../../../locales/i18n';
import { ActivityEventRow } from './ActivityEventRow';
import {
  selectActiveTab,
  selectSeasonId,
  selectSeasonStartDate,
  selectSeasonStatusLoading,
  selectSeasonActivityTypes,
} from '../../../../../../reducers/rewards/selectors';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import MetamaskRewardsActivityEmptyImage from '../../../../../../images/rewards/metamask-rewards-activity-empty.svg';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { setActiveTab } from '../../../../../../actions/rewards';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAccountNames } from '../../../../../hooks/DisplayName/useAccountNames';
import { NameType } from '../../../../Name/Name.types';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import SelectOptionSheet from '../../../../SelectOptionSheet';
import type { ISelectOption } from '../../../../SelectOptionSheet/types';

const ALL_FILTER_VALUE = 'ALL';

interface ActivityFilterProps {
  selectedType: PointsEventEarnType | undefined;
  onSelectType: (type: PointsEventEarnType | undefined) => void;
}

const ActivityFilter: React.FC<ActivityFilterProps> = ({
  selectedType,
  onSelectType,
}) => {
  const seasonActivityTypes = useSelector(selectSeasonActivityTypes);
  const selectedValue = selectedType ?? ALL_FILTER_VALUE;

  const filterOptions: ISelectOption[] = useMemo(() => {
    const allOption: ISelectOption = {
      key: 'all',
      value: ALL_FILTER_VALUE,
      label: strings('rewards.filter_all'),
    };

    const activityOptions: ISelectOption[] = (seasonActivityTypes ?? []).map(
      (activityType) => ({
        key: activityType.type.toLowerCase(),
        value: activityType.type,
        label: activityType.title,
      }),
    );

    return [allOption, ...activityOptions];
  }, [seasonActivityTypes]);

  const handleValueChange = useCallback(
    (value: string) => {
      onSelectType(
        value === ALL_FILTER_VALUE ? undefined : (value as PointsEventEarnType),
      );
    },
    [onSelectType],
  );

  return (
    <Box twClassName="mb-4 flex-row">
      <Box twClassName="bg-background-muted rounded-lg">
        <SelectOptionSheet
          label={strings('rewards.filter_title')}
          options={filterOptions}
          selectedValue={selectedValue}
          onValueChange={handleValueChange}
        />
      </Box>
    </Box>
  );
};

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
  const activeTab = useSelector(selectActiveTab);
  const [selectedType, setSelectedType] = useState<
    PointsEventEarnType | undefined
  >(undefined);

  const handleSelectType = useCallback(
    (type: PointsEventEarnType | undefined) => {
      setSelectedType(type);
    },
    [],
  );

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
    type: selectedType,
    enabled: activeTab === 'activity',
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

  // Determine loading and content states
  const isInitialLoading =
    (isLoading || (seasonStatusLoading && !!seasonStartDate)) && !isRefreshing;
  const shouldShowLoadingSkeleton =
    (isLoading || pointsEvents === null) && !pointsEvents?.length && !error;
  const hasError = error && !pointsEvents?.length;
  const hasPointsEvents = pointsEvents?.length;

  // Render content based on state
  const renderContent = () => {
    if (isInitialLoading || shouldShowLoadingSkeleton) {
      return <Skeleton style={tw.style('flex-1 rounded-lg')} />;
    }

    if (hasError) {
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

  return (
    <Box twClassName="flex-1">
      <ActivityFilter
        selectedType={selectedType}
        onSelectType={handleSelectType}
      />
      {renderContent()}
    </Box>
  );
};
