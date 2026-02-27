import React, { useMemo } from 'react';
import { Image, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import type { MarketInsightsTrendItemProps } from './MarketInsightsTrendItem.types';
import {
  getFaviconUrl,
  getUniqueSourcesByFavicon,
  isXSourceUrl,
} from '../../utils/marketInsightsFormatting';

const MAX_VISIBLE_SOURCE_LOGOS = 3;

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
        type: 'article',
        url: article.url || article.source,
      }),
    );
    const tweetSources: MarketInsightsSource[] = (trend.tweets ?? []).map(
      (tweet) => ({
        name: 'X',
        type: 'tweet',
        url: tweet.url || 'https://x.com',
      }),
    );

    return getUniqueSourcesByFavicon([...articleSources, ...tweetSources]).slice(
      0,
      MAX_VISIBLE_SOURCE_LOGOS,
    );
  }, [trend.articles, trend.tweets]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('px-4 py-3', onPress && pressed && 'opacity-70')
      }
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="mb-2"
      >
        {trend.title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {trend.description}
        {uniqueSources.length > 0 ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="pt-2"
        >
          {/* {uniqueSources.map((source, index) => (
            <Box
              key={`${source.name}-${source.url}`}
              twClassName={`h-4 w-4 rounded-full border border-muted bg-default overflow-hidden ${
                index > 0 ? '-ml-1' : ''
              }`}
            >
              {isXSourceUrl(source.url) ? (
                <Box twClassName="h-4 w-4 items-center justify-center rounded-full">
                  <Icon
                    name={IconName.X}
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                  />
                </Box>
              ) : (
                <Image
                  source={{ uri: getFaviconUrl(source.url) }}
                  style={tw.style('h-4 w-4 rounded-full')}
                />
              )}
            </Box>
          ))} */}
        </Box>
      ) : null}
      </Text>
    </Pressable>
  );
};

export default MarketInsightsTrendItem;
