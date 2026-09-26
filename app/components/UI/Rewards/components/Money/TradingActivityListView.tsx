import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import ErrorBoundary from '../../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../RewardsErrorBanner';
import TradingActivityListSkeleton from './TradingActivityListSkeleton';
import type { UseCursorPaginatedListResult } from '../../hooks/useCursorPaginatedList';
import { strings } from '../../../../../../locales/i18n';

export interface TradingActivityListViewTestIds {
  CONTAINER: string;
  LIST: string;
  SKELETON_SLOT: string;
}

interface TradingActivityListViewProps<T extends { id: string }> {
  /** Name reported by `ErrorBoundary` when the screen throws. */
  view: string;
  title: string;
  testIDs: TradingActivityListViewTestIds;
  list: UseCursorPaginatedListResult<T>;
  renderItem: (item: T) => React.ReactElement | null;
}

/**
 * Full-screen, cursor-paginated activity list shared by the Money trading
 * commissions and rebates screens.
 *
 * The skeleton fills the measured body under the header. Cached rows stay on
 * screen while a page reloads; the error banner only replaces an empty list.
 * The 32px bottom inset sits on the wrapping container so the list never
 * scrolls into it.
 */
function TradingActivityListView<T extends { id: string }>({
  view,
  title,
  testIDs,
  list,
  renderItem,
}: TradingActivityListViewProps<T>): React.ReactElement {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
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
  } = list;

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

  const renderListItem = useCallback(
    ({ item }: { item: T }) => renderItem(item),
    [renderItem],
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
    <ErrorBoundary navigation={navigation} view={view}>
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={testIDs.CONTAINER}
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
              testID={testIDs.SKELETON_SLOT}
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
              renderItem={renderListItem}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.4}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={tw.style('gap-4')}
              testID={testIDs.LIST}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
              }
            />
          )}
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

export default TradingActivityListView;
