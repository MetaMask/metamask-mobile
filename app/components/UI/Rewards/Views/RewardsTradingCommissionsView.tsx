import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  HeaderStandard,
  Skeleton,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import type { CommissionEntryView } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { PerformanceCommissionRow } from '../components/Money/PerformanceActivityRows';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { useCommissions } from '../hooks/useCommissions';
import { strings } from '../../../../../locales/i18n';

export const REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-trading-commissions-view',
  LIST: 'rewards-trading-commissions-list',
} as const;

const RewardsTradingCommissionsView: React.FC = () => {
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
  } = useCommissions(profileId);

  const title =
    localizedText?.tradingCommissionsSection ??
    localizedText?.tradeCommissions ??
    '';
  const isInitialLoadPending = isLoading || items === null;

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
    ({ item }: { item: CommissionEntryView }) =>
      localizedText ? (
        <PerformanceCommissionRow item={item} localizedText={localizedText} />
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
          title={strings('rewards.referral_details_error.error_fetching_title')}
          description={strings(
            'rewards.referral_details_error.error_fetching_description',
          )}
          onConfirm={retry}
          confirmButtonLabel={strings(
            'rewards.referral_details_error.retry_button',
          )}
        />
      );
    }
    if (isInitialLoadPending) {
      return <Skeleton style={tw.style('h-16 w-full rounded-xl')} />;
    }
    return null;
  }, [error, isInitialLoadPending, retry, tw]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsTradingCommissionsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={title}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <FlatList
          data={items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={tw.style('gap-4 px-4 pb-8')}
          testID={REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS.LIST}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsTradingCommissionsView;
