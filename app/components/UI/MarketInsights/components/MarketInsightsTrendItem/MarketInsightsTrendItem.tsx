import React, { useMemo } from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import type { MarketInsightsTrendItemProps } from './MarketInsightsTrendItem.types';

// Generates a Google favicon URL for a given domain/URL.
const getFaviconUrl = (source: string): string => {
  try {
    const domain = source.includes('://') ? new URL(source).hostname : source;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${source}&sz=32`;
  }
};

const SOURCE_ICON_IMAGE_STYLE = { width: 16, height: 16, borderRadius: 8 };

// StackedSourceIcons renders overlapping circular favicons for article sources.
const StackedSourceIcons: React.FC<{ sources: string[] }> = ({ sources }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="mt-2"
  >
    {sources.map((source, index) => (
      <Box
        key={source}
        twClassName={`w-5 h-5 rounded-full bg-default border border-muted overflow-hidden ${
          index > 0 ? '-ml-1.5' : ''
        }`}
      >
        <Image
          source={{ uri: getFaviconUrl(source) }}
          style={SOURCE_ICON_IMAGE_STYLE}
        />
      </Box>
    ))}
  </Box>
);

const MarketInsightsTrendItem: React.FC<MarketInsightsTrendItemProps> = ({
  trend,
  testID,
}) => {
  const uniqueSources = useMemo(() => {
    const seen = new Set<string>();
    return trend.articles
      .filter((article) => {
        if (seen.has(article.source)) return false;
        seen.add(article.source);
        return true;
      })
      .map((article) => article.source);
  }, [trend.articles]);

  return (
    <Box twClassName="px-4 py-3" testID={testID}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="mb-2"
      >
        {trend.title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {trend.description}
      </Text>
      {uniqueSources.length > 0 ? (
        <StackedSourceIcons sources={uniqueSources} />
      ) : null}
    </Box>
  );
};

export default MarketInsightsTrendItem;
