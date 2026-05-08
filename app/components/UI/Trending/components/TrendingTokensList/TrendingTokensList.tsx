import React, { useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenRowItem from '../TrendingTokenRowItem/TrendingTokenRowItem';
import { TimeOption, PriceChangeOption } from '../TrendingTokensBottomSheet';

/**
 * Filter context for analytics tracking
 */
export interface TrendingFilterContext {
  /** Active time filter (e.g., '24h', '6h', '1h', '5m') */
  timeFilter: TimeOption;
  /** Active sort option */
  sortOption: PriceChangeOption | undefined;
  /** Active network filter (chain ID or 'all') */
  networkFilter: string;
  /** Whether results are from search */
  isSearchResult: boolean;
}

export interface TrendingTokensListProps {
  /**
   * Trending tokens to display
   */
  trendingTokens: TrendingAsset[];
  /**
   * Selected time option to determine which price change field to display
   */
  selectedTimeOption: TimeOption;
  /**
   * Refresh control for pull-to-refresh functionality
   */
  refreshControl?: React.ReactElement<typeof RefreshControl>;
  /**
   * Filter context for analytics tracking
   */
  filterContext?: TrendingFilterContext;
}

/**
 * Optimized list component to prevent unnecessary re-renders
 * - React.memo: Prevents re-render when props haven't changed
 * - useCallback: Provides stable function references for FlashList
 * (renderItem and keyExtractor) to avoid recreating them on every render
 */
const TrendingTokensList: React.FC<TrendingTokensListProps> = React.memo(
  ({ trendingTokens, selectedTimeOption, refreshControl, filterContext }) => {
    const renderItem = useCallback(
      ({ item, index }: { item: TrendingAsset; index: number }) => (
        <TrendingTokenRowItem
          token={item}
          selectedTimeOption={selectedTimeOption}
          position={index}
          filterContext={filterContext}
        />
      ),
      [selectedTimeOption, filterContext],
    );

    const keyExtractor = useCallback(
      (item: TrendingAsset, index: number) => `${item.assetId}-${index}`,
      [],
    );

    return (
      <FlashList
        data={trendingTokens}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl as React.ReactElement}
        testID="trending-tokens-list"
      />
    );
  },
);

TrendingTokensList.displayName = 'TrendingTokensList';

export default TrendingTokensList;
