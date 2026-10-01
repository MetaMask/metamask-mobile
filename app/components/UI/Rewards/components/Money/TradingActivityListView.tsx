import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconColor,
  IconName,
  TabEmptyState,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import ErrorBoundary from '../../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../RewardsErrorBanner';
import TradingActivityListSkeleton from './TradingActivityListSkeleton';
import type { UseCursorPaginatedListResult } from '../../hooks/useCursorPaginatedList';
import { strings } from '../../../../../../locales/i18n';

export const TRADING_ACTIVITY_LIST_EMPTY_TEST_ID =
  'trading-activity-list-empty';

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
  /** Empty-state description from referral `localized_text`. */
  emptyDescription: string;
  /** Empty-state button label. The button renders only with `emptyOnAction`. */
  emptyActionLabel?: string;
  emptyOnAction?: () => void;
}

/**
 * Full-screen, cursor-paginated activity list shared by the Money trading
 * commissions and rebates screens.
 *
 * The skeleton fills the measured body under the header. Cached rows stay on
 * screen while a page reloads. A failed fetch still shows the error banner:
 * above the rows when any are cached, and in place of the list when none are.
 * A successful fetch with no rows shows the empty state. The 32px bottom
 * inset sits on the wrapping container so the list never scrolls into it.
 */
function TradingActivityListView<T extends { id: string }>({
  view,
  title,
  testIDs,
  list,
  renderItem,
  emptyDescription,
  emptyActionLabel,
  emptyOnAction,
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

  const hasRows = Boolean(items && items.length > 0);

  const renderErrorBanner = useCallback(() => {
    if (!error) {
      return null;
    }
    return (
      <Box twClassName={hasRows ? 'mb-4' : undefined}>
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
      </Box>
    );
  }, [error, hasRows, retry]);

  const renderEmpty = useCallback(() => {
    if (error) {
      return renderErrorBanner();
    }
    return (
      <Box twClassName="items-center py-4">
        <TabEmptyState
          icon={
            <AvatarIcon
              iconName={IconName.Activity}
              size={AvatarIconSize.Xl}
              severity={AvatarIconSeverity.Neutral}
              iconProps={{ color: IconColor.IconDefault }}
            />
          }
          description={emptyDescription}
          descriptionProps={{
            variant: TextVariant.BodyMd,
            color: TextColor.TextAlternative,
          }}
          {...(emptyActionLabel && emptyOnAction
            ? {
                actionButtonText: emptyActionLabel,
                actionButtonProps: {
                  variant: ButtonVariant.Primary,
                  size: ButtonSize.Lg,
                  twClassName: 'mt-3 self-stretch',
                  testID: `${TRADING_ACTIVITY_LIST_EMPTY_TEST_ID}-action`,
                },
                onAction: emptyOnAction,
              }
            : {})}
          testID={TRADING_ACTIVITY_LIST_EMPTY_TEST_ID}
        />
      </Box>
    );
  }, [
    emptyActionLabel,
    emptyDescription,
    emptyOnAction,
    error,
    renderErrorBanner,
  ]);

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
              ListHeaderComponent={hasRows ? renderErrorBanner : null}
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
