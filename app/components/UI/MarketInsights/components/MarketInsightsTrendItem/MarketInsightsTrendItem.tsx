import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import type { MarketInsightsTrendItemProps } from './MarketInsightsTrendItem.types';
import { getUniqueSourcesByFavicon } from '../../utils/marketInsightsFormatting';
import SourceLogoGroup from '../SourceLogoGroup';

const MarketInsightsTrendItem: React.FC<MarketInsightsTrendItemProps> = ({
  trend,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const uniqueSources = useMemo(() => {
    const articleSources: MarketInsightsSource[] = trend.articles.map(
      (article) => ({
        name: article.source,
        type: 'news',
        url: article.url || article.source,
      }),
    );
    const tweetSources: MarketInsightsSource[] = (trend.tweets ?? []).map(
      (tweet) => ({
        name: 'X',
        type: 'social',
        url: tweet.url || 'https://x.com',
      }),
    );

    return getUniqueSourcesByFavicon([...articleSources, ...tweetSources]);
  }, [trend.articles, trend.tweets]);

  const firstSource = uniqueSources[0];
  const remainingCount = Math.max(0, uniqueSources.length - 1);
  const sourceLabel = (() => {
    if (!firstSource) return null;
    if (firstSource.name === 'X' && remainingCount === 0) return null;
    return remainingCount > 0
      ? `${firstSource.name} +${remainingCount}`
      : firstSource.name;
  })();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('px-4 py-3', onPress && pressed && 'opacity-70')
      }
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Text variant={TextVariant.HeadingSm} twClassName="mb-2">
        {trend.title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {trend.description}
      </Text>
      {uniqueSources.length > 0 && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="pt-2 gap-2"
        >
          <SourceLogoGroup sources={uniqueSources} />
          {sourceLabel ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {sourceLabel}
            </Text>
          ) : null}
        </Box>
      )}
    </Pressable>
  );
};

export default MarketInsightsTrendItem;
