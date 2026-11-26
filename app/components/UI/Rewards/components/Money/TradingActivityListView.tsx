import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  TabEmptyState,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import RewardsErrorBanner from '../RewardsErrorBanner';
import TradingActivityListSkeleton from './TradingActivityListSkeleton';
import type { UseCursorPaginatedListResult } from '../../hooks/useCursorPaginatedList';
import { strings } from '../../../../../../locales/i18n';

export const TRADING_ACTIVITY_LIST_EMPTY_TEST_ID =
  'trading-activity-list-empty';

/** Rows the skeleton draws while the first page loads. */
const SKELETON_ROWS = 5;

export interface TradingActivityListViewTestIds {
  LIST: string;
}

interface TradingActivityListViewProps<T extends { id: string }> {
  testIDs: TradingActivityListViewTestIds;
  list: UseCursorPaginatedListResult<T>;
  renderItem: (item: T) => React.ReactElement | null;
  /**
   * Row identity. Defaults to `id`. A feed that mixes types, such as earnings
   * and claims, must include the type: those rows can share an id.
   */
  keyExtractor?: (item: T) => string;
  /**
   * Empty-state description from referral `localized_text`. Without one, a
   * successful fetch with no rows shows nothing under the header.
   */
  emptyDescription?: string;
  /** Empty-state button label. The button renders only with `emptyOnAction`. */
  emptyActionLabel?: string;
  emptyOnAction?: () => void;
  /** Defaults to the trading-activity icon. Copy trading passes People. */
  emptyIconName?: IconName;
  /**
   * Scrolls with the list, above the rows, the empty state, and the loading
   * skeleton. It is full width: a caller that wants side padding adds it.
   */
  header?: React.ReactElement | null;
}

/**
 * Cursor-paginated activity list shared by the Money earn pages and the
 * earnings history screen. It is not a screen: the page chrome comes from
 * `RewardsMoneyListScreen`, and this list is the page's only scroller.
 *
 * The skeleton shows while the first page loads. Cached rows stay on screen
 * while a page reloads. The error banner replaces the rows only when the
 * fetch failed and there are no rows to show. A successful fetch with no rows
 * shows the empty state. The 32px bottom inset sits on the content container
 * so the list never scrolls into it.
 */
function TradingActivityListView<T extends { id: string }>({
  testIDs,
  list,
  renderItem,
  keyExtractor = (item) => item.id,
  emptyDescription,
  emptyActionLabel,
  emptyOnAction,
  emptyIconName = IconName.Activity,
  header,
}: TradingActivityListViewProps<T>): React.ReactElement {
  const tw = useTailwind();
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

  const onEndReached = useCallback(() => {
    if (
      hasMore &&
      !error &&
      !isLoading &&
      !isLoadingMore &&
      !isRefreshing &&
      items &&
      items.length > 0
    ) {
      loadMore();
    }
  }, [error, hasMore, isLoading, isLoadingMore, isRefreshing, items, loadMore]);

  const renderListItem = useCallback(
    ({ item }: { item: T }) => {
      const row = renderItem(item);
      return row ? <Box className="px-4 pb-4">{row}</Box> : null;
    },
    [renderItem],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || !items || items.length === 0) {
      return null;
    }
    return (
      <Box className="items-center py-4">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore, items]);

  const hasRows = Boolean(items && items.length > 0);

  const renderErrorBanner = useCallback(() => {
    if (!error || hasRows) {
      return null;
    }
    return (
      <Box className="px-4">
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
    if (isInitialLoadPending && !error) {
      return (
        <Box className="px-4">
          <TradingActivityListSkeleton rows={SKELETON_ROWS} />
        </Box>
      );
    }
    if (error) {
      return renderErrorBanner();
    }
    if (!emptyDescription) {
      return null;
    }
    return (
      <Box className="items-center px-4 py-4">
        <TabEmptyState
          icon={
            <AvatarIcon
              iconName={emptyIconName}
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
    emptyIconName,
    emptyOnAction,
    error,
    isInitialLoadPending,
    renderErrorBanner,
  ]);

  return (
    <FlatList
      style={tw.style('flex-1')}
      data={isInitialLoadPending ? [] : (items ?? [])}
      keyExtractor={keyExtractor}
      renderItem={renderListItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={header ?? null}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={tw.style('pb-8')}
      testID={testIDs.LIST}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
      }
    />
  );
}

export default TradingActivityListView;
