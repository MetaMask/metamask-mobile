import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
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
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { getUniqueSourcesByFavicon } from '../../utils/marketInsightsFormatting';
import { endTrace, TraceName } from '../../../../../util/trace';
import SourceLogoGroup from '../SourceLogoGroup';

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

/**
 * MarketInsightsEntryCard is the entry point card shown on the token details page.
 * Tapping navigates to the full Market Insights view.
 */
const MarketInsightsEntryCard: React.FC<MarketInsightsEntryCardProps> = ({
  report,
  timeAgo,
  onPress,
  caip19Id,
  testID,
}) => {
  const tw = useTailwind();
  const uniqueSources = useMemo(
    () => getUniqueSourcesByFavicon(report.sources ?? []),
    [report.sources],
  );

  useEffect(() => {
    // End the trace started by the parent (AssetOverviewContent) to measure
    // how long it takes for the entry card to mount after navigation.
    endTrace({
      name: TraceName.MarketInsightsEntryCardLoad,
      id: caip19Id,
    });
  }, [caip19Id]);

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

          <SourceLogoGroup sources={uniqueSources} />

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('market_insights.footer_disclaimer')}
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
