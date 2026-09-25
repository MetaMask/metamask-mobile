import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import type { LedgerEarningEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { PerformanceRebateRow } from '../components/Money/PerformanceActivityRows';
import TradingActivityListSkeleton from '../components/Money/TradingActivityListSkeleton';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { useCashbackLedger } from '../hooks/useCashbackLedger';
import { strings } from '../../../../../locales/i18n';

export const REWARDS_TRADING_REBATES_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-trading-rebates-view',
  LIST: 'rewards-trading-rebates-list',
  SKELETON_SLOT: 'rewards-trading-rebates-skeleton-slot',
} as const;

const RewardsTradingRebatesView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { profileId } = useSessionProfileId();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    retry,
    isRefreshing,
  } = useCashbackLedger(profileId);

  const title = localizedText?.tradingRebates ?? '';
  const isInitialLoadPending = isLoading || items === null;
  const [bodyHeight, setBodyHeight] = useState(0);

  const onEndReached = useCallback(() => {
    if (
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      !isRefreshing &&
      items &&
      items.length > 0
    ) {
      loadMore();
    }
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, items, loadMore]);

  const renderItem = useCallback(
    ({ item }: { item: LedgerEarningEntryDto }) =>
      localizedText ? (
        <PerformanceRebateRow item={item} localizedText={localizedText} />
      ) : null,
    [localizedText],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || !items || items.length === 0) {
      return null;
    }
    return (
      <Box twClassName="items-center py-4">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore, items]);

  const renderEmpty = useCallback(() => {
    if (error) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.trading_activity_error.error_fetching_title')}
          description={strings(
            'rewards.trading_activity_error.error_fetching_description',
          )}
          onConfirm={retry}
          confirmButtonLabel={strings(
            'rewards.trading_activity_error.retry_button',
          )}
        />
      );
    }
    return null;
  }, [error, retry]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsTradingRebatesView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_TRADING_REBATES_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={title}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <Box twClassName="flex-1 px-4 pb-8 pt-2">
          {isInitialLoadPending && !error ? (
            <Box
              collapsable={false}
              twClassName="flex-1"
              testID={REWARDS_TRADING_REBATES_VIEW_TEST_IDS.SKELETON_SLOT}
              onLayout={(event) => {
                const next = event.nativeEvent.layout.height;
                setBodyHeight((current) => (current === next ? current : next));
              }}
            >
              <TradingActivityListSkeleton height={bodyHeight} />
            </Box>
          ) : (
            <FlatList
              style={tw.style('flex-1')}
              data={items ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.4}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={tw.style('gap-4')}
              testID={REWARDS_TRADING_REBATES_VIEW_TEST_IDS.LIST}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
              }
            />
          )}
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsTradingRebatesView;
