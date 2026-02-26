import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { endTrace, TraceName } from '../../../../../util/trace';
import { getFaviconUrl } from '../../utils/marketInsightsFormatting';

const MAX_VISIBLE_SOURCE_LOGOS = 3;

const SparkleIcon: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 },
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Icon
        name={IconName.Sparkle}
        size={IconSize.Lg}
        color={IconColor.IconDefault}
      />
    </Animated.View>
  );
};

const SourceLogoGroup: React.FC<{ sources?: MarketInsightsSource[] }> = ({
  sources,
}) => {
  const tw = useTailwind();

  const uniqueSources = useMemo(() => {
    const seenFaviconUrls = new Set<string>();
    return (sources ?? []).filter((source) => {
      const faviconUrl = getFaviconUrl(source.url);
      if (seenFaviconUrls.has(faviconUrl)) {
        return false;
      }
      seenFaviconUrls.add(faviconUrl);
      return true;
    });
  }, [sources]);

  if (uniqueSources.length === 0) {
    return null;
  }

  return (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      {uniqueSources.slice(0, MAX_VISIBLE_SOURCE_LOGOS).map((source, index) => (
        <Box
          key={source.name}
          twClassName={`h-4 w-4 rounded-full border border-muted bg-default overflow-hidden ${
            index > 0 ? '-ml-1' : ''
          }`}
        >
          <Image
            source={{ uri: getFaviconUrl(source.url) }}
            style={tw.style('h-4 w-4 rounded-full')}
          />
        </Box>
      ))}
    </Box>
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

  useEffect(() => {
    // Finishes measuring the time it takes to load the market insights entry card after
    // the component is mounted
    endTrace({ name: TraceName.MarketInsightsEntryCardLoad });
  }, []);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('mx-4 rounded-2xl bg-muted p-4', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Box twClassName="mb-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <SparkleIcon />
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
            {strings('market_insights.title')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </Box>

      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {report.summary}
      </Text>

      <Box twClassName="mt-3">
        <SourceLogoGroup sources={report.sources ?? []} />
      </Box>

      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextMuted}
        twClassName="mt-3"
      >
        {strings('market_insights.disclaimer')}
        {'  •  '}
        {timeAgo}
      </Text>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
