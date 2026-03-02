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
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import {
  getFaviconUrl,
  getUniqueSourcesByFavicon,
  isXSourceUrl,
} from '../../utils/marketInsightsFormatting';

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

  const uniqueSources = useMemo(
    () => getUniqueSourcesByFavicon(sources ?? []),
    [sources],
  );

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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => tw.style('px-4', pressed && 'opacity-80')}
      testID={testID}
    >
      <Box gap={2}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('market_insights.title')}
            </Text>
            <SparkleIcon />
          </Box>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Box>

        <Box gap={3}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {report.summary}
          </Text>

          <SourceLogoGroup sources={report.sources ?? []} />

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('market_insights.disclaimer')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {'•'}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {timeAgo}
            </Text>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
