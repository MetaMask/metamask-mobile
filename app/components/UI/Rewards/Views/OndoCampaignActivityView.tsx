import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoActivityRow from '../components/Campaigns/OndoActivityRow';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ActivityRouteParams = {
  [key: string]: { campaignId: string };
};

export const CAMPAIGN_ACTIVITY_TEST_IDS = {
  CONTAINER: 'campaign-activity-container',
} as const;

const OndoCampaignActivityView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<ActivityRouteParams>>();
  const { campaignId } = route.params;

  const { campaigns } = useRewardCampaigns();
  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const {
    activityEntries,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  } = useGetOndoCampaignActivity(campaignId);

  const renderItem = useCallback(
    ({ item, index }: { item: OndoGmActivityEntryDto; index: number }) => (
      <Box twClassName="px-4">
        <OndoActivityRow
          entry={item}
          testID={`campaign-activity-row-${index}`}
        />
      </Box>
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: OndoGmActivityEntryDto, index: number) =>
      `${item.timestamp}-${index}`,
    [],
  );

  const onEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <Box twClassName="py-4 items-center">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    if (error) {
      return (
        <Box twClassName="px-4 pt-4">
          <RewardsErrorBanner
            title={strings('rewards.ondo_campaign_activity.error_title')}
            description={strings(
              'rewards.ondo_campaign_activity.error_description',
            )}
            onConfirm={refresh}
            confirmButtonLabel={strings(
              'rewards.ondo_campaign_activity.retry_button',
            )}
          />
        </Box>
      );
    }

    return (
      <Box twClassName="px-4 pt-4">
        <RewardsInfoBanner
          title={strings('rewards.ondo_campaign_activity.empty_title')}
          description={strings(
            'rewards.ondo_campaign_activity.empty_description',
          )}
        />
      </Box>
    );
  }, [isLoading, error, refresh]);

  const renderHeader = useCallback(() => {
    if (isLoading && (!activityEntries || activityEntries.length === 0)) {
      return (
        <Box twClassName="px-4 pt-4 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={tw.style('h-12 rounded-lg')} />
          ))}
        </Box>
      );
    }
    return null;
  }, [isLoading, activityEntries, tw]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignActivityView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_ACTIVITY_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={
            campaign?.name
              ? `${campaign.name} ${strings('rewards.ondo_campaign_activity.title')}`
              : strings('rewards.ondo_campaign_activity.title')
          }
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'campaign-activity-back-button' }}
          includesTopInset
        />

        <FlatList
          data={activityEntries ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignActivityView;
