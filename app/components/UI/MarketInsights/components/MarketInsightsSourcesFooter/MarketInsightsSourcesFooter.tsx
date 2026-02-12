import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsSourcesFooterProps } from './MarketInsightsSourcesFooter.types';

/** Maximum number of source icons to show before the "+N" label */
const MAX_VISIBLE_SOURCES = 4;

/**
 * MarketInsightsSourcesFooter displays a row of source indicators
 * and like/dislike feedback buttons at the bottom of the insights view.
 */
const MarketInsightsSourcesFooter: React.FC<
  MarketInsightsSourcesFooterProps
> = ({ sources, testID }) => {
  const visibleCount = Math.min(sources.length, MAX_VISIBLE_SOURCES);
  const remainingCount = Math.max(sources.length - MAX_VISIBLE_SOURCES, 0);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 pt-3 pb-8"
      testID={testID}
    >
      {/* Sources pill */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="bg-muted rounded-full px-3 py-2"
        gap={1}
      >
        {/* Source icons stacked */}
        <Box flexDirection={BoxFlexDirection.Row} twClassName="pr-2">
          {sources.slice(0, visibleCount).map((source, index) => (
            <Box
              key={source.name}
              twClassName={`w-5 h-5 rounded-full bg-default border border-muted items-center justify-center ${
                index > 0 ? '-ml-2' : ''
              }`}
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {source.name.charAt(0)}
              </Text>
            </Box>
          ))}
        </Box>
        {remainingCount > 0 && (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('market_insights.sources_count', {
              count: String(remainingCount),
            })}
          </Text>
        )}
      </Box>

      {/* Feedback buttons */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <Icon
          name={IconName.ThumbUp}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
        <Icon
          name={IconName.ThumbDown}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Box>
  );
};

export default MarketInsightsSourcesFooter;
