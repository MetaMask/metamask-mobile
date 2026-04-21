import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import {
  Box,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoActivityRow from '../components/Campaigns/OndoActivityRow';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import { formatRewardsDateLabel } from '../utils/formatUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

type ActivityListItem =
  | { kind: 'date-header'; dateKey: string; label: string }
  | { kind: 'activity'; entry: OndoGmActivityEntryDto; index: number };

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PortfolioRouteParams = {
  [key: string]: { campaignId: string };
};

export const CAMPAIGN_PORTFOLIO_TEST_IDS = {
  CONTAINER: 'campaign-portfolio-container',
} as const;

const OndoCampaignPortfolioView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<PortfolioRouteParams>>();
  const { campaignId } = route.params;

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_activity',
    campaign_id: campaignId,
  });

  const {
    activityEntries,
    isLoading: isActivityLoading,
    isLoadingMore,
    hasMore,
    error: activityError,
    loadMore,
    refresh: refreshActivity,
    isRefreshing,
  } = useGetOndoCampaignActivity(campaignId);

  const groupedItems = useMemo<ActivityListItem[]>(() => {
    if (!activityEntries) return [];
    const items: ActivityListItem[] = [];
    let lastDateKey = '';
    activityEntries.forEach((entry, index) => {
      const dateKey = entry.timestamp.slice(0, 10);
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        items.push({
          kind: 'date-header',
          dateKey,
          label: formatRewardsDateLabel(new Date(entry.timestamp)),
        });
      }
      items.push({ kind: 'activity', entry, index });
    });
    return items;
  }, [activityEntries]);

  const renderItem = useCallback(({ item }: { item: ActivityListItem }) => {
    if (item.kind === 'date-header') {
      return (
        <Box twClassName="px-4 pt-4 pb-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {item.label}
          </Text>
        </Box>
      );
    }
    return (
      <Box twClassName="px-4">
        <OndoActivityRow
          entry={item.entry}
          timeOnly
          testID={`portfolio-activity-row-${item.index}`}
        />
      </Box>
    );
  }, []);

  const keyExtractor = useCallback(
    (item: ActivityListItem, index: number) =>
      item.kind === 'date-header'
        ? `header-${item.dateKey}`
        : `activity-${index}`,
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
    if (isActivityLoading) return null;

    if (activityError) {
      return (
        <Box twClassName="px-4 pt-2">
          <RewardsErrorBanner
            title={strings('rewards.ondo_campaign_activity.error_title')}
            description={strings(
              'rewards.ondo_campaign_activity.error_description',
            )}
            onConfirm={refreshActivity}
            confirmButtonLabel={strings(
              'rewards.ondo_campaign_activity.retry_button',
            )}
          />
        </Box>
      );
    }

    return (
      <Box twClassName="px-4 pt-2">
        <RewardsInfoBanner
          title={strings('rewards.ondo_campaign_activity.empty_title')}
          description={strings(
            'rewards.ondo_campaign_activity.empty_description',
          )}
        />
      </Box>
    );
  }, [isActivityLoading, activityError, refreshActivity]);

  const renderHeader = useCallback(() => {
    const showActivitySkeletons =
      isActivityLoading && (!activityEntries || activityEntries.length === 0);

    if (!showActivitySkeletons) return null;

    return (
      <Box twClassName="px-4 pb-2 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={tw.style('h-12 rounded-lg')} />
        ))}
      </Box>
    );
  }, [isActivityLoading, activityEntries, tw]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignPortfolioView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_PORTFOLIO_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.ondo_campaign_portfolio.activity_title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'campaign-portfolio-back-button' }}
          endButtonIconProps={[
            {
              iconName: IconName.Question,
              onPress: () =>
                navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                  campaignId,
                }),
              testID: 'campaign-portfolio-mechanics-button',
            },
          ]}
          includesTopInset
        />

        <FlatList<ActivityListItem>
          data={groupedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshActivity}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignPortfolioView;
