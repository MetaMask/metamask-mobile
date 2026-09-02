import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import {
  Box,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../../../Rewards/components/RewardsErrorBanner';
import type { LedgerEntryDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import EarningsLedgerRow from './EarningsLedgerRow';

interface EarningsLedgerListProps {
  entries: LedgerEntryDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
  ListHeaderComponent?: React.ReactElement | null;
}

const LedgerRowSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box twClassName="w-full py-3 gap-2">
      <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
      <Skeleton style={tw.style('h-3 w-40 rounded-lg')} />
    </Box>
  );
};

/**
 * The ledger, following the VIP transactions list: `onEndReached` at 0.3, a
 * footer spinner, pull-to-refresh, and a tri-state empty renderer so an
 * in-flight first page never shows "no earnings yet".
 */
const EarningsLedgerList: React.FC<EarningsLedgerListProps> = ({
  entries,
  isLoading,
  isLoadingMore,
  isRefreshing,
  hasMore,
  error,
  loadMore,
  refresh,
  retry,
  ListHeaderComponent,
}) => {
  const tw = useTailwind();

  const renderItem = useCallback(
    ({ item, index }: { item: LedgerEntryDto; index: number }) => (
      <Box twClassName="px-4">
        <EarningsLedgerRow
          entry={item}
          testID={`rewards-money-ledger-row-${index}`}
        />
      </Box>
    ),
    [],
  );

  const keyExtractor = useCallback((item: LedgerEntryDto) => item.id, []);

  const onEndReached = useCallback(() => {
    if (
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      !isRefreshing &&
      entries &&
      entries.length > 0
    ) {
      loadMore();
    }
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, entries, loadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || !entries || entries.length === 0) {
      return null;
    }
    return (
      <Box twClassName="py-4 items-center">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore, entries]);

  const isInitialLoadPending = isLoading || entries === null;

  const renderEmpty = useCallback(() => {
    if (error) {
      return (
        <Box twClassName="px-4 pt-2">
          <RewardsErrorBanner
            title={strings('rewards_money.ledger.error_title')}
            description={strings('rewards_money.ledger.error_description')}
            onConfirm={retry}
            confirmButtonLabel={strings('rewards_money.ledger.retry')}
          />
        </Box>
      );
    }

    // Any in-flight first-page load with no rows shows skeletons, never the
    // settled empty copy.
    if (isInitialLoadPending) {
      return (
        <Box
          twClassName="px-4 pb-2"
          testID={REWARDS_MONEY_TEST_IDS.LEDGER_SKELETON}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <LedgerRowSkeleton key={index} />
          ))}
        </Box>
      );
    }

    return (
      <Box twClassName="p-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={REWARDS_MONEY_TEST_IDS.LEDGER_EMPTY}
        >
          {strings('rewards_money.ledger.empty')}
        </Text>
      </Box>
    );
  }, [error, isInitialLoadPending, retry]);

  return (
    <FlatList<LedgerEntryDto>
      testID={REWARDS_MONEY_TEST_IDS.LEDGER_LIST}
      style={tw.style('flex-1')}
      data={entries ?? []}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

export default EarningsLedgerList;
