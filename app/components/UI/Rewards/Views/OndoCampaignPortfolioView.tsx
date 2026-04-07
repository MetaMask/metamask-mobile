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
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoPortfolio from '../components/Campaigns/OndoPortfolio';
import OndoActivityRow from '../components/Campaigns/OndoActivityRow';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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

  const { campaigns } = useRewardCampaigns();
  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const {
    portfolio,
    isLoading: isPortfolioLoading,
    hasError: hasPortfolioError,
    hasFetched: portfolioHasFetched,
    refetch: refetchPortfolio,
  } = useGetOndoPortfolioPosition(campaignId);

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

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchPortfolio(), refreshActivity()]);
  }, [refetchPortfolio, refreshActivity]);

  const renderItem = useCallback(
    ({ item, index }: { item: OndoGmActivityEntryDto; index: number }) => (
      <Box twClassName="px-4">
        <OndoActivityRow
          entry={item}
          testID={`portfolio-activity-row-${index}`}
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

    return (
      <Box>
        <Box twClassName="p-4">
          <OndoPortfolio
            portfolio={portfolio}
            isLoading={isPortfolioLoading}
            hasError={hasPortfolioError}
            hasFetched={portfolioHasFetched}
            refetch={refetchPortfolio}
          />
        </Box>

        <Box twClassName="border-b border-border-muted" />

        <Box twClassName="px-4 pt-4 pb-2">
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.ondo_campaign_activity.title')}
          </Text>
        </Box>

        {showActivitySkeletons && (
          <Box twClassName="px-4 pb-2 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} style={tw.style('h-12 rounded-lg')} />
            ))}
          </Box>
        )}
      </Box>
    );
  }, [
    portfolio,
    isPortfolioLoading,
    hasPortfolioError,
    portfolioHasFetched,
    refetchPortfolio,
    isActivityLoading,
    activityEntries,
    tw,
  ]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignPortfolioView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_PORTFOLIO_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.ondo_campaign_portfolio.positions_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'campaign-portfolio-back-button' }}
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
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignPortfolioView;
