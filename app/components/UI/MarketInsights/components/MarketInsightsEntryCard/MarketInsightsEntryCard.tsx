import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { buildHighlightedSegments } from '../../utils/marketInsightsFormatting';

// Gradient colors for the "Market insights" title
const TITLE_GRADIENT_COLORS = ['#FFA680', '#BAF24A'];

// GradientTitle renders the "Market insights" title with a gradient text effect.
const GradientTitle: React.FC = () => (
  <MaskedView
    maskElement={
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Icon
          name={IconName.Sparkle}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
        />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('market_insights.title')}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
        />
      </Box>
    }
  >
    <LinearGradient
      colors={TITLE_GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="opacity-0"
      >
        <Icon name={IconName.Sparkle} size={IconSize.Sm} />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('market_insights.title')}
        </Text>
        <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
      </Box>
    </LinearGradient>
  </MaskedView>
);

/**
 * Renders the summary text with trend titles highlighted.
 * Searches the summary for occurrences of trend titles and renders them.
 */
const HighlightedSummary: React.FC<{
  summary: string;
  trendTitles: string[];
}> = ({ summary, trendTitles }) => {
  const segments = useMemo(
    () => buildHighlightedSegments(summary, trendTitles),
    [summary, trendTitles],
  );

  return (
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Text
            key={`segment-${index}`}
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
          >
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
};

/**
 * MarketInsightsEntryCard is the entry point card shown on the token details page.
 * Tapping navigates to the full Market Insights view.
 */
const MarketInsightsEntryCard: React.FC<MarketInsightsEntryCardProps> = ({
  report,
  timeAgo,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const trendTitles = useMemo(
    () => report.trends.map((t) => t.title),
    [report.trends],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('mx-4 rounded-2xl bg-muted p-4', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Box twClassName="mb-3">
        <GradientTitle />
      </Box>

      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        twClassName="mb-2"
      >
        {report.headline}
      </Text>

      <HighlightedSummary summary={report.summary} trendTitles={trendTitles} />

      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextMuted}
        twClassName="mt-3"
      >
        {strings('market_insights.updated_ago', { time: timeAgo })}
        {'  '}
        {strings('market_insights.disclaimer')}
      </Text>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
