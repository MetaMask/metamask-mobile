import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
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
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { endTrace, TraceName } from '../../../../../util/trace';
import { AnimatedGradientBorder } from './AnimatedGradientBorder';
import {
  BORDER_GRADIENT_COLORS,
  VISIBILITY_THRESHOLD,
} from './AnimatedGradientBorder.constants';
import { useViewportTracking } from '../../hooks/useViewportTracking';

const sparkleStyles = StyleSheet.create({
  container: { width: 24, height: 24 },
  gradient: { flex: 1 },
});

const SparkleIcon: React.FC = () => (
  <MaskedView
    style={sparkleStyles.container}
    maskElement={
      <Icon
        name={IconName.Ai}
        size={IconSize.Lg}
        color={IconColor.IconDefault}
      />
    }
  >
    <LinearGradient
      colors={[...BORDER_GRADIENT_COLORS]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={sparkleStyles.gradient}
    />
  </MaskedView>
);

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
  const [cardDimensions, setCardDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { ref: cardRef, onLayout: onVisibilityLayout } = useViewportTracking(
    () => setShouldAnimate(true),
    VISIBILITY_THRESHOLD,
  );

  useEffect(() => {
    if (caip19Id) {
      endTrace({
        name: TraceName.MarketInsightsEntryCardLoad,
        id: caip19Id,
      });
    }
  }, [caip19Id]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setCardDimensions({ width, height });
    },
    [],
  );

  return (
    <Pressable
      ref={cardRef}
      onPress={onPress}
      onLayout={onVisibilityLayout}
      style={({ pressed }) =>
        tw.style('px-4 mt-2 mb-4', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Box
        twClassName="bg-background-muted rounded-2xl"
        padding={4}
        gap={3}
        onLayout={handleLayout}
      >
        <AnimatedGradientBorder
          dimensions={cardDimensions}
          shouldAnimate={shouldAnimate}
        />

        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          numberOfLines={3}
        >
          {report.summary}
        </Text>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <SparkleIcon />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('market_insights.footer_disclaimer')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {'•'}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {timeAgo}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
