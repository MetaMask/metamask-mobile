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
import type { ClaimDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import ClaimsRow from './ClaimsRow';

export interface ClaimsListProps {
  claims: ClaimDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
  /**
   * Resolves what a row opens. Returning null makes the row inert — an
   * `EXPIRED` or `FAILED` claim has no transaction, and a claim settled without
   * provenance has no hash to open.
   */
  resolveRowPress: (
    claim: ClaimDto,
  ) => { onPress: () => void; isInferredMatch: boolean } | null;
  ListHeaderComponent?: React.ReactElement | null;
}

const ClaimRowSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box twClassName="w-full py-4 gap-2">
      <Skeleton style={tw.style('h-4 w-28 rounded-lg')} />
      <Skeleton style={tw.style('h-3 w-20 rounded-lg')} />
    </Box>
  );
};

/**
 * Claim history. Deliberately the same list mechanics as the ledger —
 * `onEndReached` at 0.3, footer spinner, pull-to-refresh, and a tri-state empty
 * renderer so an in-flight first page never shows the settled empty copy.
 */
const ClaimsList: React.FC<ClaimsListProps> = ({
  claims,
  isLoading,
  isLoadingMore,
  isRefreshing,
  hasMore,
  error,
  loadMore,
  refresh,
  retry,
  resolveRowPress,
  ListHeaderComponent,
}) => {
  const tw = useTailwind();

  const renderItem = useCallback(
    ({ item, index }: { item: ClaimDto; index: number }) => {
      const press = resolveRowPress(item);
      return (
        <Box twClassName="px-4">
          <ClaimsRow
            claim={item}
            onPress={press?.onPress}
            isInferredMatch={press?.isInferredMatch}
            testID={`rewards-money-claims-row-${index}`}
          />
        </Box>
      );
    },
    [resolveRowPress],
  );

  const keyExtractor = useCallback((item: ClaimDto) => item.id, []);

  const onEndReached = useCallback(() => {
    if (
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      !isRefreshing &&
      claims &&
      claims.length > 0
    ) {
      loadMore();
    }
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, claims, loadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || !claims || claims.length === 0) {
      return null;
    }
    return (
      <Box twClassName="py-4 items-center">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore, claims]);

  const isInitialLoadPending = isLoading || claims === null;

  const renderEmpty = useCallback(() => {
    if (error) {
      return (
        <Box twClassName="px-4 pt-2">
          <RewardsErrorBanner
            title={strings('rewards_money.claims.error_title')}
            description={strings('rewards_money.claims.error_description')}
            onConfirm={retry}
            confirmButtonLabel={strings('rewards_money.ledger.retry')}
          />
        </Box>
      );
    }

    if (isInitialLoadPending) {
      return (
        <Box
          twClassName="px-4 pb-2"
          testID={REWARDS_MONEY_TEST_IDS.CLAIMS_SKELETON}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <ClaimRowSkeleton key={index} />
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
          testID={REWARDS_MONEY_TEST_IDS.CLAIMS_EMPTY}
        >
          {strings('rewards_money.claims.empty')}
        </Text>
      </Box>
    );
  }, [error, isInitialLoadPending, retry]);

  return (
    <FlatList<ClaimDto>
      testID={REWARDS_MONEY_TEST_IDS.CLAIMS_LIST}
      style={tw.style('flex-1')}
      data={claims ?? []}
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

export default ClaimsList;
