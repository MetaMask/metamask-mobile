import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenRowItem from './TrendingTokenRowItem/TrendingTokenRowItem';

export interface TrendingTokensListProps {
  /**
   * Trending tokens to display
   */
  trendingTokens: TrendingAsset[];
  /**
   * Callback when a token is pressed
   */
  onTokenPress: (token: TrendingAsset) => void;
}

const TrendingTokensList: React.FC<TrendingTokensListProps> = ({
  trendingTokens,
  onTokenPress,
}) => {
  const renderItem = useCallback(
    ({ item }: { item: TrendingAsset }) => (
      <TrendingTokenRowItem token={item} onPress={() => onTokenPress(item)} />
    ),
    [onTokenPress],
  );

  return (
    <FlashList
      data={trendingTokens}
      renderItem={renderItem}
      keyExtractor={(item: TrendingAsset) => item.assetId}
      keyboardShouldPersistTaps="handled"
      testID="trending-tokens-list"
    />
  );
};

export default TrendingTokensList;
